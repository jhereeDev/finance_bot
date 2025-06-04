const aiService = require("./aiService");
const { prisma } = require("../config/database");
const logger = require("../utils/logger");

class SmartCategorizationService {
  async suggestCategory(userId, transactionDescription, merchantName, amount) {
    try {
      // Get user's existing categories
      const userCategories = await prisma.category.findMany({
        where: { userId: userId },
      });

      const categoryNames = userCategories.map((c) => c.name).join(", ");

      const prompt = `Based on this transaction, suggest the most appropriate category:

Transaction: "${transactionDescription}" at "${merchantName}" for $${amount}
Available categories: ${categoryNames}

Respond with just the category name that best fits. If none fit well, suggest a new category name.`;

      const result = await aiService.generateResponse(userId, prompt);

      if (result.success) {
        const suggestedCategory = result.response.trim();

        // Find matching category or suggest new one
        const existingCategory = userCategories.find(
          (c) => c.name.toLowerCase() === suggestedCategory.toLowerCase()
        );

        return {
          success: true,
          categoryName: existingCategory
            ? existingCategory.name
            : suggestedCategory,
          isExisting: !!existingCategory,
          confidence: this.calculateConfidence(result.response),
        };
      }

      return { success: false, error: "Failed to categorize transaction" };
    } catch (error) {
      logger.error("Smart categorization error:", error);
      return { success: false, error: "Categorization service unavailable" };
    }
  }

  calculateConfidence(response) {
    // Simple confidence calculation based on response characteristics
    if (response.length < 20 && !response.includes("could be")) {
      return 0.9; // High confidence for short, definitive answers
    } else if (response.includes("might be") || response.includes("could be")) {
      return 0.6; // Medium confidence for uncertain language
    }
    return 0.7; // Default confidence
  }

  async learnFromCorrection(
    userId,
    originalSuggestion,
    correctedCategory,
    transactionData
  ) {
    try {
      // Log the correction for future model improvement
      logger.info("Category correction logged", {
        userId,
        original: originalSuggestion,
        corrected: correctedCategory,
        transaction: transactionData,
        timestamp: new Date(),
      });

      // In a production system, you might want to store these corrections
      // and periodically retrain your categorization model
    } catch (error) {
      logger.error("Error logging category correction:", error);
    }
  }
}

module.exports = new SmartCategorizationService();
