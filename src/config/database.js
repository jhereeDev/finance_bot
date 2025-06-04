const { PrismaClient } = require("@prisma/client");

class DatabaseService {
  constructor() {
    this.prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "info", "warn", "error"]
          : ["error"],
      errorFormat: "pretty",
    });
    this.connect();
  }

  async connect() {
    try {
      await this.prisma.$connect();
      console.log("✅ Database connected successfully");
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      process.exit(1);
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
    console.log("📴 Database disconnected");
  }

  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "healthy", timestamp: new Date() };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  // Transaction wrapper for complex operations
  async transaction(operations) {
    return await this.prisma.$transaction(operations);
  }

  getClient() {
    return this.prisma;
  }
}

// Singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;
