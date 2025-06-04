const prisma = require("../models");

class BudgetEngine {
  async getCurrentSpending(userId, categoryId = null, period = "monthly") {
    const { startDate, endDate } = this.getPeriodDates(period);

    const query = {
      where: {
        user_id: userId,
        transaction_date: {
          gte: startDate,
          lte: endDate,
        },
      },
    };

    if (categoryId) {
      query.where.category_id = categoryId;
    }

    const transactions = await prisma.transaction.findMany(query);
    return transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  }

  async getBudgetStatus(userId) {
    const budgets = await prisma.budget.findMany({
      where: {
        user_id: userId,
        is_active: true,
      },
      include: {
        category: true,
      },
    });

    const status = [];

    for (const budget of budgets) {
      const spent = await this.getCurrentSpending(
        userId,
        budget.category_id,
        budget.period_type
      );

      const remaining = parseFloat(budget.amount) - spent;
      const percentage = (spent / parseFloat(budget.amount)) * 100;

      status.push({
        category: budget.category.name,
        budgeted: parseFloat(budget.amount),
        spent: spent,
        remaining: remaining,
        percentage: percentage,
        status: this.getBudgetStatusColor(percentage),
      });
    }

    return status;
  }

  getBudgetStatusColor(percentage) {
    if (percentage < 50) return "green";
    if (percentage < 80) return "yellow";
    if (percentage < 100) return "orange";
    return "red";
  }

  getPeriodDates(period) {
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case "weekly":
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        endDate = new Date(now.setDate(startDate.getDate() + 6));
        break;
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
    }

    return { startDate, endDate };
  }

  async generateWeeklyReport(userId) {
    const { startDate, endDate } = this.getPeriodDates("weekly");
    const budgetStatus = await this.getBudgetStatus(userId);

    const transactions = await prisma.transaction.findMany({
      where: {
        user_id: userId,
        transaction_date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: true,
      },
      orderBy: {
        transaction_date: "desc",
      },
    });

    const totalSpent = transactions.reduce(
      (sum, t) => sum + parseFloat(t.amount),
      0
    );
    const categoryBreakdown = this.groupTransactionsByCategory(transactions);

    return {
      period: { startDate, endDate },
      totalSpent,
      transactionCount: transactions.length,
      budgetStatus,
      categoryBreakdown,
      topMerchants: this.getTopMerchants(transactions),
    };
  }

  groupTransactionsByCategory(transactions) {
    const groups = {};

    transactions.forEach((transaction) => {
      const category = transaction.category.name;
      if (!groups[category]) {
        groups[category] = {
          total: 0,
          count: 0,
          transactions: [],
        };
      }

      groups[category].total += parseFloat(transaction.amount);
      groups[category].count += 1;
      groups[category].transactions.push(transaction);
    });

    return groups;
  }

  getTopMerchants(transactions) {
    const merchants = {};

    transactions.forEach((transaction) => {
      const merchant = transaction.merchant_name || "Unknown";
      if (!merchants[merchant]) {
        merchants[merchant] = { total: 0, count: 0 };
      }

      merchants[merchant].total += parseFloat(transaction.amount);
      merchants[merchant].count += 1;
    });

    return Object.entries(merchants)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 5);
  }
}

module.exports = new BudgetEngine();
