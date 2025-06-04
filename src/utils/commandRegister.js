const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
const logger = require("./logger");

class CommandRegister {
  constructor(client) {
    this.client = client;
    this.commands = [];
  }

  async loadCommands() {
    const commandsPath = path.join(__dirname, "../bot/commands");
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);

      if ("data" in command && "execute" in command) {
        this.commands.push(command.data.toJSON());
        logger.info(`Loaded command: ${command.name}`);
      } else {
        logger.warn(`Command at ${filePath} is missing required properties`);
      }
    }
  }

  async registerCommands() {
    try {
      // Check for required environment variables
      if (!process.env.DISCORD_TOKEN) {
        throw new Error("DISCORD_TOKEN is not set in environment variables");
      }
      if (!process.env.DISCORD_CLIENT_ID) {
        throw new Error(
          "DISCORD_CLIENT_ID is not set in environment variables"
        );
      }

      const rest = new REST().setToken(process.env.DISCORD_TOKEN);
      const clientId = process.env.DISCORD_CLIENT_ID;

      logger.info(
        `Started refreshing application (/) commands for client ID: ${clientId}`
      );

      // Register commands globally
      const data = await rest.put(Routes.applicationCommands(clientId), {
        body: this.commands,
      });

      logger.info(
        `Successfully reloaded ${data.length} application (/) commands.`
      );
    } catch (error) {
      logger.error("Error registering commands:", error);
      throw error;
    }
  }
}

module.exports = CommandRegister;
