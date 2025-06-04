require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

const commands = [];
const commandsPath = path.join(__dirname, "../bot/commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

// AI-dependent commands (only register if AI is enabled)
const aiCommands = ["chat.js", "insights.js"];
const isAIEnabled = process.env.ENABLE_AI_FEATURES === "true";

// Load all commands
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  // Skip AI commands if AI features are disabled
  if (aiCommands.includes(file) && !isAIEnabled) {
    logger.info(`Skipping AI command: ${command.name} (AI features disabled)`);
    continue;
  }

  // Validate OpenAI API key for AI commands
  if (aiCommands.includes(file) && isAIEnabled) {
    if (!process.env.OPENAI_API_KEY) {
      logger.warn(
        `Skipping AI command: ${command.name} (OPENAI_API_KEY not set)`
      );
      continue;
    }
  }

  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
    logger.info(
      `Loaded command: ${command.name}${aiCommands.includes(file) ? " (AI)" : ""}`
    );
  } else {
    logger.warn(`Command at ${filePath} is missing required properties`);
  }
}

// Create REST instance
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Register commands
(async () => {
  try {
    logger.info(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    // Check if required environment variables are set
    if (!process.env.DISCORD_TOKEN) {
      throw new Error("DISCORD_TOKEN is not set in environment variables");
    }
    if (!process.env.DISCORD_CLIENT_ID) {
      throw new Error("DISCORD_CLIENT_ID is not set in environment variables");
    }

    // The put method is used to fully refresh all commands
    const data = await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );

    logger.info(
      `Successfully reloaded ${data.length} application (/) commands.`
    );

    // Log AI feature status
    if (isAIEnabled) {
      logger.info("✅ AI features are enabled");
      if (process.env.OPENAI_API_KEY) {
        logger.info("✅ OpenAI API key is configured");
      } else {
        logger.warn("⚠️ OpenAI API key is missing - AI commands were skipped");
      }
    } else {
      logger.info("ℹ️ AI features are disabled");
    }
  } catch (error) {
    logger.error("Error registering commands:", error);
  }
})();
