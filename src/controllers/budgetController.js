const { Budget, Category } = require("../models");
const { budgetEngine } = require("../services/budgetEngine");

class BudgetController {
  async createBudget(req, res) {
    try {
      const { category_id, amount, period_type, start_date, end_date } =
        req.body;
      const user_id = req.user.id;

      // Validate category exists and belongs to user
      const category = await Category.findOne({
        where: { id: category_id, user_id },
      });

      if (!category) {
        return res
          .status(404)
          .json({ success: false, error: "Category not found" });
      }

      // Deactivate any existing active budget for this category
      await Budget.update(
        { is_active: false },
        {
          where: {
            category_id,
            user_id,
            is_active: true,
          },
        }
      );

      const budget = await Budget.create({
        user_id,
        category_id,
        amount,
        period_type,
        start_date,
        end_date,
        is_active: true,
      });

      res.status(201).json({ success: true, data: budget });
    } catch (error) {
      console.error("Create budget error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create budget" });
    }
  }

  async getBudgets(req, res) {
    try {
      const user_id = req.user.id;
      const { active_only = true } = req.query;

      const where = { user_id };
      if (active_only === "true") {
        where.is_active = true;
      }

      const budgets = await Budget.findAll({
        where,
        include: [Category],
        order: [["created_at", "DESC"]],
      });

      res.json({ success: true, data: budgets });
    } catch (error) {
      console.error("Get budgets error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch budgets" });
    }
  }

  async updateBudget(req, res) {
    try {
      const { id } = req.params;
      const { amount, period_type, start_date, end_date, is_active } = req.body;
      const user_id = req.user.id;

      const budget = await Budget.findOne({
        where: { id, user_id },
      });

      if (!budget) {
        return res
          .status(404)
          .json({ success: false, error: "Budget not found" });
      }

      await budget.update({
        amount,
        period_type,
        start_date,
        end_date,
        is_active,
      });

      res.json({ success: true, data: budget });
    } catch (error) {
      console.error("Update budget error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to update budget" });
    }
  }

  async deleteBudget(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      const budget = await Budget.findOne({
        where: { id, user_id },
      });

      if (!budget) {
        return res
          .status(404)
          .json({ success: false, error: "Budget not found" });
      }

      await budget.destroy();
      res.json({ success: true, message: "Budget deleted successfully" });
    } catch (error) {
      console.error("Delete budget error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to delete budget" });
    }
  }

  async getBudgetStatus(req, res) {
    try {
      const user_id = req.user.id;
      const { category_id } = req.query;

      const status = await budgetEngine.getBudgetStatus(user_id, category_id);
      res.json({ success: true, data: status });
    } catch (error) {
      console.error("Get budget status error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to get budget status" });
    }
  }

  async getBudgetReport(req, res) {
    try {
      const user_id = req.user.id;
      const { period = "monthly" } = req.query;

      const report = await budgetEngine.generateWeeklyReport(user_id);
      res.json({ success: true, data: report });
    } catch (error) {
      console.error("Get budget report error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to get budget report" });
    }
  }
}

module.exports = new BudgetController();
