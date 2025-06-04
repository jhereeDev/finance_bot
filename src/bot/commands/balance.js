const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { prisma } = require("../../config/database");
const userService = require("../../services/userService");
const logger = require("../../utils/logger");

module.exports = {
  name: "balance",
  description: "Check your current balance",
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your current balance")
    .addStringOption((option) =>
      option
        .setName("period")
        .setDescription("Time period to check balance for")
        .setRequired(false)
        .addChoices(
          { name: "Today", value: "today" },
          { name: "This Week", value: "week" },
          { name: "This Month", value: "month" },
          { name: "This Year", value: "year" }
        )
    ),

  async execute(interaction) {
    try {
      // Get user ID and username based on interaction type
      const userId = interaction.user?.id || interaction.author?.id;
      const username =
        interaction.user?.username || interaction.author?.username;

      if (!userId || !username) {
        throw new Error("Could not determine user information");
      }

      // Get period from interaction
      let period;
      if (interaction.isChatInputCommand()) {
        period = interaction.options.getString("period") || "month";
      } else if (interaction.args && interaction.args[0]) {
        period = interaction.args[0];
      } else {
        period = "month";
      }

      // Validate period
      const validPeriods = ["today", "week", "month", "year"];
      if (!validPeriods.includes(period.toLowerCase())) {
        return await interaction.reply({
          content: `Invalid period. Please use one of: ${validPeriods.join(", ")}`,
          ephemeral: true,
        });
      }

      // Get or create user
      const user = await userService.getOrCreateUser(userId, username);
      if (!user) {
        return await interaction.reply({
          content:
            "User could not be found or created. Please try again later.",
          ephemeral: true,
        });
      }

      // Calculate date range based on period
      const now = new Date();
      let startDate;
      switch (period.toLowerCase()) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case "week":
          startDate = new Date(now.setDate(now.getDate() - now.getDay()));
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      // Get transactions for the period
      const transactions = await prisma.transaction.findMany({
        where: {
          userId: user.id,
          transactionDate: {
            gte: startDate,
          },
        },
        include: {
          category: true,
        },
        orderBy: {
          transactionDate: "desc",
        },
      });

      // Calculate total
      const total = transactions.reduce((sum, t) => sum + t.amount, 0);

      // Group by category
      const categoryTotals = transactions.reduce((acc, t) => {
        const category = t.category.name;
        acc[category] = (acc[category] || 0) + t.amount;
        return acc;
      }, {});

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(
          `Balance for ${period.charAt(0).toUpperCase() + period.slice(1)}`
        )
        .setDescription(`Total: $${total.toFixed(2)}`)
        .addFields(
          Object.entries(categoryTotals).map(([category, amount]) => ({
            name: category,
            value: `$${amount.toFixed(2)}`,
            inline: true,
          }))
        )
        .setTimestamp();

      // Send response
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [embed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    } catch (error) {
      logger.error("Error checking balance:", {
        error: error.message,
        stack: error.stack,
        userId: interaction.user?.id || interaction.author?.id,
        guildId: interaction.guild?.id,
        channelId: interaction.channel?.id,
      });

      const errorMessage = "Failed to check balance. Please try again.";
      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  },
};
