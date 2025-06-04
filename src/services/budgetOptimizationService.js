const aiService = require("./aiService");
const { prisma } = require("../config/database");
const logger = require("../utils/logger");

class BudgetOptimizationService {
  async analyzeSpendingPatterns(userId) {
    try {
      // Get 3 months of transaction data
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const transactions = await prisma.transaction.findMany({
        where: {
          userId: userId,
          transactionDate: { gte: threeMonthsAgo },
        },
        include: { category: true },
        orderBy: { transactionDate: "desc" },
      });

      if (transactions.length < 10) {
        return {
          success: false,
          error:
            "Need more transaction history for analysis (minimum 10 transactions)",
        };
      }

      // Analyze monthly patterns
      const monthlySpending = this.groupByMonth(transactions);
      const categoryTrends = this.analyzeCategoryTrends(transactions);

      const prompt = `Analyze these spending patterns and provide budget optimization recommendations:

Monthly Spending:
${Object.entries(monthlySpending)
  .map(([month, amount]) => `${month}: $${amount.toFixed(2)}`)
  .join("\n")}

Category Trends:
${Object.entries(categoryTrends)
  .map(
    ([category, data]) =>
      `${category}: $${data.total.toFixed(2)} (${data.count} transactions, avg: $${data.average.toFixed(2)})`
  )
  .join("\n")}

Provide 3-4 specific, actionable budget optimization recommendations.`;

      const result = await aiService.generateResponse(userId, prompt);

      if (result.success) {
        return {
          success: true,
          recommendations: result.response,
          data: {
            monthlySpending,
            categoryTrends,
            totalTransactions: transactions.length,
          },
        };
      }

      return result;
    } catch (error) {
      logger.error("Budget optimization error:", error);
      return {
        success: false,
        error: "Budget optimization service unavailable",
      };
    }
  }

  groupByMonth(transactions) {
    const monthly = {};

    transactions.forEach((transaction) => {
      const month = transaction.transactionDate.toISOString().substring(0, 7); // YYYY-MM
      monthly[month] = (monthly[month] || 0) + transaction.amount;
    });

    return monthly;
  }

  analyzeCategoryTrends(transactions) {
    const categories = {};

    transactions.forEach((transaction) => {
      const categoryName = transaction.category?.name || "Unknown";

      if (!categories[categoryName]) {
        categories[categoryName] = {
          total: 0,
          count: 0,
          amounts: [],
        };
      }

      categories[categoryName].total += transaction.amount;
      categories[categoryName].count += 1;
      categories[categoryName].amounts.push(transaction.amount);
    });

    // Calculate averages and trends
    Object.keys(categories).forEach((category) => {
      const data = categories[category];
      data.average = data.total / data.count;
      data.min = Math.min(...data.amounts);
      data.max = Math.max(...data.amounts);
    });

    return categories;
  }

  async suggestBudgetAmounts(userId, categoryName) {
    try {
      // Get historical spending for this category
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const transactions = await prisma.transaction.findMany({
        where: {
          userId: userId,
          transactionDate: { gte: sixMonthsAgo },
          category: {
            name: categoryName,
          },
        },
        orderBy: { transactionDate: "desc" },
      });

      if (transactions.length === 0) {
        return {
          success: false,
          error: `No historical data for ${categoryName} category`,
        };
      }

      const monthlyAmounts = this.groupByMonth(transactions);
      const avgMonthly =
        Object.values(monthlyAmounts).reduce((a, b) => a + b, 0) /
        Object.keys(monthlyAmounts).length;

      const prompt = `Based on historical spending in ${categoryName} category:

Monthly amounts: ${Object.entries(monthlyAmounts)
        .map(([month, amount]) => `${month}: $${amount.toFixed(2)}`)
        .join(", ")}

Average monthly: $${avgMonthly.toFixed(2)}
Total transactions: ${transactions.length}

Suggest appropriate budget amounts for:
1. Conservative budget (reduce spending)
2. Realistic budget (maintain current level)
3. Flexible budget (allow for increases)

Keep suggestions brief and include the reasoning.`;

      return await aiService.generateResponse(userId, prompt);
    } catch (error) {
      logger.error("Budget suggestion error:", error);
      return {
        success: false,
        error: "Budget suggestion service unavailable",
      };
    }
  }
}

module.exports = new BudgetOptimizationService();
