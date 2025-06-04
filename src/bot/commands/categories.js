const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { prisma } = require("../../config/database");
const userService = require("../../services/userService");

module.exports = {
  name: "categories",
  description: "Manage your expense categories",
  data: new SlashCommandBuilder()
    .setName("categories")
    .setDescription("Manage your expense categories")
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List all your categories")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a new category")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Name of the category")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a category")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Name of the category to delete")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      const user = await userService.getOrCreateUser(
        interaction.user.id,
        interaction.user.username
      );

      if (!user) {
        return interaction.reply({
          content:
            "User could not be found or created. Please try again later.",
          ephemeral: true,
        });
      }

      switch (subcommand) {
        case "list":
          await this.listCategories(interaction, user);
          break;
        case "add":
          await this.addCategory(interaction, user);
          break;
        case "delete":
          await this.deleteCategory(interaction, user);
          break;
      }
    } catch (error) {
      console.error("Error managing categories:", error);
      await interaction.reply({
        content: "Failed to manage categories. Please try again.",
        ephemeral: true,
      });
    }
  },

  async listCategories(interaction, user) {
    const categories = await prisma.category.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        name: "asc",
      },
    });

    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("Your Categories")
      .setDescription(
        categories.length > 0
          ? categories.map((c) => `• ${c.name}`).join("\n")
          : "No categories found. Use `/categories add` to create one."
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async addCategory(interaction, user) {
    const name = interaction.options.getString("name");

    // Check if category already exists
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: name,
        userId: user.id,
      },
    });

    if (existingCategory) {
      return interaction.reply({
        content: `Category "${name}" already exists.`,
        ephemeral: true,
      });
    }

    // Create new category
    const category = await prisma.category.create({
      data: {
        name: name,
        userId: user.id,
        isDefault: false,
      },
    });

    const embed = new EmbedBuilder()
      .setColor("#00ff00")
      .setTitle("Category Added")
      .setDescription(`Successfully added category: ${category.name}`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async deleteCategory(interaction, user) {
    const name = interaction.options.getString("name");

    // Check if category exists
    const category = await prisma.category.findFirst({
      where: {
        name: name,
        userId: user.id,
      },
    });

    if (!category) {
      return interaction.reply({
        content: `Category "${name}" not found.`,
        ephemeral: true,
      });
    }

    // Check if category is default
    if (category.isDefault) {
      return interaction.reply({
        content: "Cannot delete default categories.",
        ephemeral: true,
      });
    }

    // Check if category has transactions
    const transactionCount = await prisma.transaction.count({
      where: {
        categoryId: category.id,
      },
    });

    if (transactionCount > 0) {
      return interaction.reply({
        content: `Cannot delete category "${name}" because it has ${transactionCount} associated transactions.`,
        ephemeral: true,
      });
    }

    // Delete category
    await prisma.category.delete({
      where: {
        id: category.id,
      },
    });

    const embed = new EmbedBuilder()
      .setColor("#ff0000")
      .setTitle("Category Deleted")
      .setDescription(`Successfully deleted category: ${name}`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
