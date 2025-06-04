const { Category, Transaction } = require("../models");

class CategoryController {
  async createCategory(req, res) {
    try {
      const { name, color, emoji } = req.body;
      const user_id = req.user.id;

      const category = await Category.create({
        name,
        color,
        emoji,
        user_id,
      });

      res.status(201).json({ success: true, data: category });
    } catch (error) {
      console.error("Create category error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create category" });
    }
  }

  async getCategories(req, res) {
    try {
      const user_id = req.user.id;

      const categories = await Category.findAll({
        where: { user_id },
        include: [
          {
            model: Transaction,
            attributes: ["amount"],
            required: false,
          },
        ],
      });

      // Calculate total spent per category
      const categoriesWithTotals = categories.map((category) => {
        const total = category.Transactions.reduce(
          (sum, t) => sum + parseFloat(t.amount),
          0
        );
        const { Transactions, ...categoryData } = category.toJSON();
        return {
          ...categoryData,
          total_spent: total,
        };
      });

      res.json({ success: true, data: categoriesWithTotals });
    } catch (error) {
      console.error("Get categories error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch categories" });
    }
  }

  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, color, emoji } = req.body;
      const user_id = req.user.id;

      const category = await Category.findOne({
        where: { id, user_id },
      });

      if (!category) {
        return res
          .status(404)
          .json({ success: false, error: "Category not found" });
      }

      await category.update({
        name,
        color,
        emoji,
      });

      res.json({ success: true, data: category });
    } catch (error) {
      console.error("Update category error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to update category" });
    }
  }

  async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      const category = await Category.findOne({
        where: { id, user_id },
      });

      if (!category) {
        return res
          .status(404)
          .json({ success: false, error: "Category not found" });
      }

      // Check if category has transactions
      const transactionCount = await Transaction.count({
        where: { category_id: id },
      });

      if (transactionCount > 0) {
        return res.status(400).json({
          success: false,
          error: "Cannot delete category with existing transactions",
        });
      }

      await category.destroy();
      res.json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
      console.error("Delete category error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to delete category" });
    }
  }

  async getCategoryStats(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.user.id;
      const { start_date, end_date } = req.query;

      const where = { category_id: id, user_id };
      if (start_date && end_date) {
        where.transaction_date = {
          gte: new Date(start_date),
          lte: new Date(end_date),
        };
      }

      const transactions = await Transaction.findAll({
        where,
        order: [["transaction_date", "DESC"]],
      });

      const total = transactions.reduce(
        (sum, t) => sum + parseFloat(t.amount),
        0
      );
      const average = total / (transactions.length || 1);

      const stats = {
        total_transactions: transactions.length,
        total_spent: total,
        average_transaction: average,
        transactions: transactions,
      };

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error("Get category stats error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to get category statistics" });
    }
  }
}

module.exports = new CategoryController();
