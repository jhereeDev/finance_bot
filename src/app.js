// src/app.js
require("dotenv").config();
const databaseService = require("./config/database");
const bot = require("./bot");

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await databaseService.disconnect();
  await bot.shutdown();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await databaseService.disconnect();
  await bot.shutdown();
  process.exit(0);
});

// Initialize Discord bot
bot.start(process.env.DISCORD_TOKEN);

console.log("🤖 Discord bot is starting...");
