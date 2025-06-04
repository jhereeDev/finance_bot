const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { prisma } = require("../../config/database");
const aiService = require("../../services/aiService");
const userService = require("../../services/userService");
const logger = require("../../utils/logger");

module.exports = {
  name: "insights",
  description: "Get AI-powered insights about your spending",
  data: new SlashCommandBuilder()
    .setName("insights")
    .setDescription("Get AI-powered insights about your spending")
    .addStringOption((option) =>
      option
        .setName("period")
        .setDescription("Time period for analysis")
        .addChoices(
          { name: "Last 7 days", value: "7" },
          { name: "Last 30 days", value: "30" },
          { name: "Last 90 days", value: "90" }
        )
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!process.env.ENABLE_AI_INSIGHTS === "true") {
      return interaction.reply({
        content: "🤖 AI insights are currently disabled.",
        ephemeral: true,
      });
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      const period = parseInt(interaction.options.getString("period")) || 30;

      // Get user
      const user = await userService.getOrCreateUser(
        interaction.user.id,
        interaction.user.username
      );

      // Get transactions for the period
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);

      const transactions = await prisma.transaction.findMany({
        where: {
          userId: user.id,
          transactionDate: { gte: startDate },
        },
        include: { category: true },
        orderBy: { transactionDate: "desc" },
      });

      if (transactions.length === 0) {
        return interaction.editReply({
          content: `📊 No transactions found for the last ${period} days.`,
          ephemeral: true,
        });
      }

      // Generate AI insights
      const result = await aiService.generateTransactionInsights(
        interaction.user.id,
        transactions
      );

      if (!result.success) {
        return interaction.editReply({
          content: `❌ ${result.error}`,
          ephemeral: true,
        });
      }

      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

      const embed = new EmbedBuilder()
        .setColor("#00ff00")
        .setTitle(`📊 AI Spending Insights (Last ${period} days)`)
        .setDescription(result.response)
        .addFields(
          {
            name: "💰 Total Spent",
            value: `$${totalAmount.toFixed(2)}`,
            inline: true,
          },
          {
            name: "📝 Transactions",
            value: `${transactions.length}`,
            inline: true,
          },
          {
            name: "📈 Daily Average",
            value: `$${(totalAmount / period).toFixed(2)}`,
            inline: true,
          }
        )
        .setFooter({
          text: result.cached
            ? "Analysis from cache"
            : `Tokens used: ${result.tokens?.total || "Unknown"}`,
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
        ephemeral: true,
      });
    } catch (error) {
      logger.error("Error in insights command:", error);
      await interaction.editReply({
        content: "❌ Failed to generate insights. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
