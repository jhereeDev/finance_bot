const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");
const database = require("../utils/database");
const CommandRegister = require("../utils/commandRegister");

class FinanceBot {
  constructor() {
    // Check for required environment variables
    this.checkEnvironmentVariables();

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    // Initialize commands collection
    this.client.commands = new Collection();
    this.commandRegister = new CommandRegister(this.client);
    this.loadCommands();
    this.loadEvents();
  }

  checkEnvironmentVariables() {
    const required = ["DISCORD_TOKEN", "DISCORD_CLIENT_ID", "DATABASE_URL"];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`
      );
    }
  }

  loadCommands() {
    const commandsPath = path.join(__dirname, "commands");
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);

      if ("name" in command && "execute" in command) {
        this.client.commands.set(command.name, command);
        logger.info(`Loaded command: ${command.name}`);
      } else {
        logger.warn(`Command at ${filePath} is missing required properties`);
      }
    }
  }

  loadEvents() {
    const eventsPath = path.join(__dirname, "events");
    const eventFiles = fs
      .readdirSync(eventsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);

      if (event.once) {
        this.client.once(event.name, (...args) => event.execute(...args));
      } else {
        this.client.on(event.name, (...args) => event.execute(...args));
      }
      logger.info(`Loaded event: ${event.name}`);
    }
  }

  async start(token) {
    try {
      // Connect to database first
      await database.connect();
      logger.info("Database connection established");

      // Register slash commands
      await this.commandRegister.loadCommands();
      await this.commandRegister.registerCommands();
      logger.info("Slash commands registered");

      // Then login to Discord
      await this.client.login(token);
      logger.info("Bot logged in successfully");
    } catch (error) {
      logger.error("Failed to start bot:", error);
      await this.shutdown();
      process.exit(1);
    }
  }

  async shutdown() {
    try {
      // Disconnect from database
      await database.disconnect();
      logger.info("Database connection closed");

      // Destroy Discord client
      this.client.destroy();
      logger.info("Discord client destroyed");
    } catch (error) {
      logger.error("Error during shutdown:", error);
    }
  }
}

// Handle process termination
process.on("SIGINT", async () => {
  logger.info("Received SIGINT. Shutting down...");
  await bot.shutdown();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM. Shutting down...");
  await bot.shutdown();
  process.exit(0);
});

const bot = new FinanceBot();
module.exports = bot;
