const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class BudgetService {
  async createBudget(budgetData) {
    return await prisma.budget.create({
      data: {
        userId: budgetData.userId,
        categoryId: budgetData.categoryId,
        name: budgetData.name,
        amount: budgetData.amount,
        currency: budgetData.currency || "USD",
        periodType: budgetData.periodType,
        startDate: budgetData.startDate,
        endDate: budgetData.endDate,
        alertThreshold: budgetData.alertThreshold || 0.8,
        isRollover: budgetData.isRollover || false,
      },
      include: {
        category: true,
      },
    });
  }

  async getBudgets(userId, isActive = true) {
    return await prisma.budget.findMany({
      where: {
        userId,
        isActive,
      },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getBudgetStatus(userId, budgetId = null) {
    const where = {
      userId,
      isActive: true,
      ...(budgetId && { id: budgetId }),
    };

    const budgets = await prisma.budget.findMany({
      where,
      include: {
        category: true,
      },
    });

    const budgetStatus = [];

    for (const budget of budgets) {
      const spent = await this.getSpentAmount(
        userId,
        budget.categoryId,
        budget.startDate,
        budget.endDate
      );
      const remaining = parseFloat(budget.amount) - spent;
      const percentage = (spent / parseFloat(budget.amount)) * 100;

      budgetStatus.push({
        id: budget.id,
        category: budget.category.name,
        categoryId: budget.categoryId,
        budgeted: parseFloat(budget.amount),
        spent: spent,
        remaining: remaining,
        percentage: percentage,
        status: this.getBudgetStatusLevel(percentage),
        alertThreshold: budget.alertThreshold,
        periodType: budget.periodType,
        startDate: budget.startDate,
        endDate: budget.endDate,
        isOverBudget: spent > parseFloat(budget.amount),
        daysRemaining: this.getDaysRemaining(budget.endDate),
      });
    }

    return budgetStatus;
  }

  async getSpentAmount(userId, categoryId, startDate, endDate) {
    const result = await prisma.transaction.aggregate({
      where: {
        userId,
        categoryId,
        isDeleted: false,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return parseFloat(result._sum.amount) || 0;
  }

  getBudgetStatusLevel(percentage) {
    if (percentage < 50) return "good";
    if (percentage < 80) return "warning";
    if (percentage < 100) return "danger";
    return "over";
  }

  getDaysRemaining(endDate) {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  async updateBudget(budgetId, userId, updateData) {
    return await prisma.budget.update({
      where: {
        id: budgetId,
        userId,
      },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: {
        category: true,
      },
    });
  }

  async deleteBudget(budgetId, userId) {
    return await prisma.budget.update({
      where: {
        id: budgetId,
        userId,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  async generateBudgetReport(userId, periodType = "monthly") {
    const { startDate, endDate } = this.getPeriodDates(periodType);

    const [budgetStatus, totalSpent, transactionCount] = await Promise.all([
      this.getBudgetStatus(userId),
      this.getSpentAmount(userId, null, startDate, endDate),
      prisma.transaction.count({
        where: {
          userId,
          isDeleted: false,
          transactionDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
    ]);

    const totalBudgeted = budgetStatus.reduce(
      (sum, budget) => sum + budget.budgeted,
      0
    );
    const overBudgetCategories = budgetStatus.filter((b) => b.isOverBudget);

    return {
      period: { startDate, endDate, type: periodType },
      summary: {
        totalBudgeted,
        totalSpent,
        remaining: totalBudgeted - totalSpent,
        transactionCount,
      },
      budgetStatus,
      overBudgetCategories,
      recommendations: this.generateRecommendations(budgetStatus),
    };
  }

  getPeriodDates(periodType) {
    const now = new Date();
    let startDate, endDate;

    switch (periodType) {
      case "weekly":
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        endDate = new Date(now.setDate(startDate.getDate() + 6));
        break;
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "quarterly":
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        break;
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        throw new Error("Invalid period type");
    }

    return { startDate, endDate };
  }

  generateRecommendations(budgetStatus) {
    const recommendations = [];

    budgetStatus.forEach((budget) => {
      if (budget.percentage > 100) {
        recommendations.push({
          type: "over_budget",
          category: budget.category,
          message: `You've exceeded your ${budget.category} budget by $${Math.abs(budget.remaining).toFixed(2)}`,
        });
      } else if (budget.percentage > 80) {
        recommendations.push({
          type: "approaching_limit",
          category: budget.category,
          message: `You're close to your ${budget.category} budget limit with ${budget.daysRemaining} days remaining`,
        });
      }
    });

    return recommendations;
  }
}

module.exports = new BudgetService();
