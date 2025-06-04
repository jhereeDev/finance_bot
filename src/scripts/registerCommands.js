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

// Load all commands
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
    logger.info(`Loaded command: ${command.name}`);
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

    // The put method is used to fully refresh all commands
    const data = await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );

    logger.info(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    logger.error("Error registering commands:", error);
  }
})();
