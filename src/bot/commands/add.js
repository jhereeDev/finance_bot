const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { prisma } = require("../../config/database");
const userService = require("../../services/userService");

module.exports = {
  name: "add",
  description: "Add a new transaction",
  data: new SlashCommandBuilder()
    .setName("add")
    .setDescription("Add a new transaction")
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("The amount of the transaction")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Description of the transaction")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("Category of the transaction")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("date")
        .setDescription("Date of the transaction (YYYY-MM-DD)")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const amount = interaction.options.getNumber("amount");
      const description = interaction.options.getString("description");
      const categoryName = interaction.options.getString("category");
      const dateStr = interaction.options.getString("date");

      // Ensure user exists
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

      // Create transaction
      const transaction = await prisma.transaction.create({
        data: {
          userId: user.id,
          categoryId: category.id,
          amount: amount,
          description: description,
          transactionDate: dateStr ? new Date(dateStr) : new Date(),
          isManual: true,
        },
        include: {
          category: true,
        },
      });

      const embed = new EmbedBuilder()
        .setColor("#00ff00")
        .setTitle("Transaction Added Successfully!")
        .addFields(
          { name: "Amount", value: `$${amount.toFixed(2)}`, inline: true },
          { name: "Description", value: description, inline: true },
          { name: "Category", value: category.name, inline: true },
          {
            name: "Date",
            value: transaction.transactionDate.toLocaleDateString(),
            inline: true,
          }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error("Error adding transaction:", error);
      await interaction.reply({
        content: "Failed to add the transaction. Please try again.",
        ephemeral: true,
      });
    }
  },
};
