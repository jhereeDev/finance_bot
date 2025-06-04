const { PrismaClient } = require("@prisma/client");
const logger = require("./logger");

class Database {
  constructor() {
    this.prisma = null;
  }

  async connect() {
    try {
      this.prisma = new PrismaClient();
      await this.prisma.$connect();
      logger.info("Successfully connected to database");
    } catch (error) {
      logger.error("Failed to connect to database:", error);
      throw error;
    }
  }

  async disconnect() {
    if (this.prisma) {
      await this.prisma.$disconnect();
      logger.info("Disconnected from database");
    }
  }

  getClient() {
    if (!this.prisma) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.prisma;
  }
}

// Create a singleton instance
const database = new Database();

module.exports = database;
