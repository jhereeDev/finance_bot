const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const conversationService = require("../../services/conversationService");
const logger = require("../../utils/logger");

module.exports = {
  name: "chat",
  description: "Chat with your AI financial assistant",
  data: new SlashCommandBuilder()
    .setName("chat")
    .setDescription("Chat with your AI financial assistant")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Your question or message")
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!process.env.ENABLE_AI_FEATURES === "true") {
      return interaction.reply({
        content: "🤖 AI features are currently disabled.",
        ephemeral: true,
      });
    }

    try {
      const message = interaction.options.getString("message");

      // Show typing indicator
      await interaction.deferReply({ ephemeral: true });

      // Process the message
      const result = await conversationService.processMessage(
        interaction.user.id,
        message
      );

      if (!result.success) {
        return interaction.editReply({
          content: `❌ ${result.error}`,
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("💬 AI Financial Assistant")
        .setDescription(result.response)
        .setFooter({
          text: result.cached
            ? "Response from cache • Use responsibly"
            : `Tokens used: ${result.tokens?.total || "Unknown"} • Use responsibly`,
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
        ephemeral: true,
      });
    } catch (error) {
      logger.error("Error in chat command:", error);
      await interaction.editReply({
        content: "❌ Something went wrong. Please try again later.",
        ephemeral: true,
      });
    }
  },
};
