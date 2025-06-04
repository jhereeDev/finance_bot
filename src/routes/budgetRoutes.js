const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const budgetController = require("../controllers/budgetController");

// Apply authentication middleware to all routes
router.use(auth);

// Budget routes
router.post("/", budgetController.createBudget);
router.get("/", budgetController.getBudgets);
router.get("/status", budgetController.getBudgetStatus);
router.get("/report", budgetController.getBudgetReport);
router.put("/:id", budgetController.updateBudget);
router.delete("/:id", budgetController.deleteBudget);

module.exports = router;
