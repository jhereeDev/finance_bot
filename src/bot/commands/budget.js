const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { prisma } = require("../../config/database");
const userService = require("../../services/userService");

module.exports = {
  name: "budget",
  description: "Manage your budgets",
  data: new SlashCommandBuilder()
    .setName("budget")
    .setDescription("Manage your budgets")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription("Set a budget for a category")
        .addStringOption((option) =>
          option
            .setName("category")
            .setDescription("Category to set budget for")
            .setRequired(true)
        )
        .addNumberOption((option) =>
          option
            .setName("amount")
            .setDescription("Budget amount")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("period")
            .setDescription("Budget period")
            .setRequired(true)
            .addChoices(
              { name: "Daily", value: "daily" },
              { name: "Weekly", value: "weekly" },
              { name: "Monthly", value: "monthly" },
              { name: "Yearly", value: "yearly" }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List all your budgets")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a budget")
        .addStringOption((option) =>
          option
            .setName("category")
            .setDescription("Category to delete budget for")
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
        case "set":
          await this.setBudget(interaction, user);
          break;
        case "list":
          await this.listBudgets(interaction, user);
          break;
        case "delete":
          await this.deleteBudget(interaction, user);
          break;
      }
    } catch (error) {
      console.error("Error managing budgets:", error);
      await interaction.reply({
        content: "Failed to manage budgets. Please try again.",
        ephemeral: true,
      });
    }
  },

  async setBudget(interaction, user) {
    const categoryName = interaction.options.getString("category");
    const amount = interaction.options.getNumber("amount");
    const period = interaction.options.getString("period");

    // Get or create category
    let category = await prisma.category.findFirst({
      where: {
        name: categoryName,
        userId: user.id,
      },
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: categoryName,
          userId: user.id,
          isDefault: false,
        },
      });
    }

    // Create or update budget
    const budget = await prisma.budget.upsert({
      where: {
        id:
          (
            await prisma.budget.findFirst({
              where: {
                userId: user.id,
                categoryId: category.id,
                periodType: period,
              },
            })
          )?.id || "new",
      },
      update: {
        amount: amount,
        periodType: period,
        startDate: new Date(),
        endDate: this.getEndDate(period),
        isActive: true,
      },
      create: {
        userId: user.id,
        categoryId: category.id,
        amount: amount,
        periodType: period,
        startDate: new Date(),
        endDate: this.getEndDate(period),
        isActive: true,
      },
    });

    const embed = new EmbedBuilder()
      .setColor("#00ff00")
      .setTitle("Budget Set")
      .setDescription(
        `Successfully set ${period} budget for ${category.name} to $${amount.toFixed(2)}`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  getEndDate(period) {
    const now = new Date();
    switch (period) {
      case "daily":
        return new Date(now.setHours(23, 59, 59, 999));
      case "weekly":
        return new Date(now.setDate(now.getDate() + 7));
      case "monthly":
        return new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
      case "yearly":
        return new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      default:
        return new Date(now.setDate(now.getDate() + 30));
    }
  },

  async listBudgets(interaction, user) {
    const budgets = await prisma.budget.findMany({
      where: {
        userId: user.id,
      },
      include: {
        category: true,
      },
      orderBy: {
        category: {
          name: "asc",
        },
      },
    });

    if (budgets.length === 0) {
      return interaction.reply({
        content: "No budgets set. Use `/budget set` to create one.",
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("Your Budgets")
      .setDescription(
        budgets
          .map(
            (b) =>
              `• ${b.category.name}: $${b.amount.toFixed(2)} (${b.periodType})`
          )
          .join("\n")
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async deleteBudget(interaction, user) {
    const categoryName = interaction.options.getString("category");

    // Find category
    const category = await prisma.category.findFirst({
      where: {
        name: categoryName,
        userId: user.id,
      },
    });

    if (!category) {
      return interaction.reply({
        content: `Category "${categoryName}" not found.`,
        ephemeral: true,
      });
    }

    // Find and delete budget
    const budget = await prisma.budget.findFirst({
      where: {
        userId: user.id,
        categoryId: category.id,
      },
    });

    if (!budget) {
      return interaction.reply({
        content: `No budget found for category "${categoryName}".`,
        ephemeral: true,
      });
    }

    await prisma.budget.delete({
      where: {
        id: budget.id,
      },
    });

    const embed = new EmbedBuilder()
      .setColor("#ff0000")
      .setTitle("Budget Deleted")
      .setDescription(`Successfully deleted budget for ${category.name}`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
