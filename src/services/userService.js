const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class UserService {
  async createUser(userData) {
    try {
      const user = await prisma.user.create({
        data: {
          discordId: userData.discordId,
          username: userData.username,
          email: userData.email,
          timezone: userData.timezone || "UTC",
          currency: userData.currency || "USD",
          preferences: userData.preferences || {},
        },
        include: {
          categories: true,
        },
      });

      // Create default categories for new user
      await this.createDefaultCategories(user.id);

      return user;
    } catch (error) {
      if (error.code === "P2002") {
        throw new Error("User already exists");
      }
      throw error;
    }
  }

  async findByDiscordId(discordId) {
    return await prisma.user.findUnique({
      where: { discordId },
      include: {
        categories: {
          where: { isActive: true },
        },
        budgets: {
          where: { isActive: true },
          include: { category: true },
        },
      },
    });
  }

  async updateUser(userId, updateData) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });
  }

  async createDefaultCategories(userId) {
    const defaultCategories = [
      { name: "Groceries", emoji: "🛒", color: "#4CAF50" },
      { name: "Dining", emoji: "🍽️", color: "#FF9800" },
      { name: "Transportation", emoji: "🚗", color: "#2196F3" },
      { name: "Entertainment", emoji: "🎬", color: "#9C27B0" },
      { name: "Shopping", emoji: "🛍️", color: "#E91E63" },
      { name: "Healthcare", emoji: "⚕️", color: "#F44336" },
      { name: "Utilities", emoji: "⚡", color: "#607D8B" },
      { name: "Other", emoji: "📦", color: "#795548" },
    ];

    return await prisma.category.createMany({
      data: defaultCategories.map((cat) => ({
        ...cat,
        userId,
        isDefault: true,
      })),
    });
  }

  async getUserStats(userId) {
    const [transactionCount, totalSpent, categoriesCount] = await Promise.all([
      prisma.transaction.count({
        where: { userId, isDeleted: false },
      }),
      prisma.transaction.aggregate({
        where: { userId, isDeleted: false },
        _sum: { amount: true },
      }),
      prisma.category.count({
        where: { userId, isActive: true },
      }),
    ]);

    return {
      transactionCount,
      totalSpent: totalSpent._sum.amount || 0,
      categoriesCount,
    };
  }

  async getOrCreateUser(discordId, username) {
    try {
      // Try to find existing user
      let user = await prisma.user.findUnique({
        where: { discordId: discordId },
      });

      // If user doesn't exist, create them
      if (!user) {
        user = await prisma.user.create({
          data: {
            discordId: discordId,
            username: username,
            timezone: "UTC",
            currency: "USD",
          },
        });
      }

      return user;
    } catch (error) {
      console.error("Error in getOrCreateUser:", error);
      throw error;
    }
  }
}

module.exports = new UserService();
