const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require("../../utils/logger");

module.exports = {
  name: "help",
  description: "Shows all available commands and their usage",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows all available commands and their usage")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("Get detailed help for a specific command")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const commandName = interaction.options.getString("command");

      if (commandName) {
        await this.showCommandHelp(interaction, commandName);
      } else {
        await this.showAllCommands(interaction);
      }
    } catch (error) {
      logger.error("Error showing help:", {
        error: error.message,
        stack: error.stack,
        userId: interaction.user?.id,
        guildId: interaction.guild?.id,
        channelId: interaction.channel?.id,
      });
      await interaction.reply({
        content: "Failed to show help. Please try again.",
        ephemeral: true,
      });
    }
  },

  async showCommandHelp(interaction, commandName) {
    const command = interaction.client.commands.get(commandName);

    if (!command) {
      return interaction.reply({
        content: `Command "${commandName}" not found.`,
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle(`Command: /${command.name}`)
      .setDescription(command.description)
      .addFields({
        name: "Usage",
        value: this.formatCommandUsage(command.data),
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async showAllCommands(interaction) {
    const commands = interaction.client.commands;
    const categories = {
      "💰 Finance": ["balance", "budget", "add"],
      "📋 Management": ["categories", "receipt"],
      "❓ Help": ["help"],
    };

    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("Available Commands")
      .setDescription(
        "Here are all the available commands:\n\n" +
          Object.entries(categories)
            .map(
              ([category, cmds]) =>
                `${category}\n${cmds
                  .map(
                    (cmd) => `\`/${cmd}\` - ${commands.get(cmd).description}`
                  )
                  .join("\n")}`
            )
            .join("\n\n") +
          "\n\nUse `/help <command>` for detailed information about a specific command"
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  formatCommandUsage(command) {
    if (!command || !command.options) {
      return "No additional options required.";
    }

    const options = command.options;
    if (options.length === 0) {
      return "No additional options required.";
    }

    return options
      .map((option) => {
        const required = option.required ? " (required)" : " (optional)";
        return `\`${option.name}\`${required}: ${option.description}`;
      })
      .join("\n");
  },
};
