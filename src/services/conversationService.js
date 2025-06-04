const { prisma } = require("../config/database");
const aiService = require("./aiService");
const logger = require("../utils/logger");

class ConversationService {
  async getUserContext(userId) {
    try {
      // Get recent transactions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [user, recentTransactions, budgets] = await Promise.all([
        prisma.user.findUnique({
          where: { discordId: userId },
          include: { categories: true },
        }),
        prisma.transaction.findMany({
          where: {
            userId: userId,
            transactionDate: { gte: thirtyDaysAgo },
          },
          include: { category: true },
          orderBy: { transactionDate: "desc" },
          take: 10,
        }),
        prisma.budget.findMany({
          where: { userId: userId, isActive: true },
          include: { category: true },
        }),
      ]);

      if (!user) return null;

      // Calculate spending summary
      const totalSpent = recentTransactions.reduce(
        (sum, t) => sum + t.amount,
        0
      );
      const categorySpending = {};

      recentTransactions.forEach((t) => {
        const category = t.category?.name || "Unknown";
        categorySpending[category] =
          (categorySpending[category] || 0) + t.amount;
      });

      return {
        userId: user.discordId,
        username: user.username,
        currency: user.currency,
        recentSpending: {
          total: totalSpent,
          transactionCount: recentTransactions.length,
          categories: categorySpending,
        },
        budgets: budgets.map((b) => ({
          category: b.category.name,
          amount: b.amount,
          periodType: b.periodType,
        })),
        preferredCategories: user.categories.map((c) => c.name).slice(0, 5),
      };
    } catch (error) {
      logger.error("Error getting user context:", error);
      return null;
    }
  }

  async processMessage(userId, message) {
    try {
      // Get user context
      const context = await this.getUserContext(userId);

      if (!context) {
        return {
          success: false,
          error:
            "User not found. Please use a finance command first to set up your account.",
        };
      }

      // Generate AI response
      const result = await aiService.generateResponse(userId, message, context);

      if (result.success) {
        // Log conversation for learning (optional)
        await this.logConversation(userId, message, result.response);
      }

      return result;
    } catch (error) {
      logger.error("Error processing message:", error);
      return {
        success: false,
        error: "Failed to process your message. Please try again.",
      };
    }
  }

  async logConversation(userId, userMessage, aiResponse) {
    try {
      // Optional: Store conversation for analytics/improvement
      // Only store if user has consented to data collection
      logger.info("Conversation logged", {
        userId,
        messageLength: userMessage.length,
        responseLength: aiResponse.length,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Error logging conversation:", error);
    }
  }
}

module.exports = new ConversationService();
