const { Transaction, Category, User } = require("../models");
const { receiptParser } = require("../services/receiptParser");
const { ocrService } = require("../services/ocrService");
const { budgetEngine } = require("../services/budgetEngine");

class TransactionController {
  async createTransaction(req, res) {
    try {
      const {
        amount,
        category_id,
        description,
        merchant_name,
        transaction_date,
        currency,
      } = req.body;
      const user_id = req.user.id;

      const transaction = await Transaction.create({
        user_id,
        category_id,
        amount,
        description,
        merchant_name,
        transaction_date: transaction_date || new Date(),
        currency: currency || "USD",
        is_manual: true,
      });

      // Check budget status after new transaction
      const budgetStatus = await budgetEngine.getBudgetStatus(user_id);
      const categoryBudget = budgetStatus.find(
        (b) => b.category_id === category_id
      );

      res.status(201).json({
        success: true,
        data: transaction,
        budget_status: categoryBudget,
      });
    } catch (error) {
      console.error("Create transaction error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to create transaction" });
    }
  }

  async getTransactions(req, res) {
    try {
      const {
        start_date,
        end_date,
        category_id,
        limit = 50,
        offset = 0,
      } = req.query;
      const user_id = req.user.id;

      const where = { user_id };
      if (start_date && end_date) {
        where.transaction_date = {
          gte: new Date(start_date),
          lte: new Date(end_date),
        };
      }
      if (category_id) {
        where.category_id = category_id;
      }

      const transactions = await Transaction.findAndCountAll({
        where,
        include: [Category],
        order: [["transaction_date", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      res.json({
        success: true,
        data: transactions.rows,
        total: transactions.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (error) {
      console.error("Get transactions error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch transactions" });
    }
  }

  async updateTransaction(req, res) {
    try {
      const { id } = req.params;
      const {
        amount,
        category_id,
        description,
        merchant_name,
        transaction_date,
      } = req.body;
      const user_id = req.user.id;

      const transaction = await Transaction.findOne({
        where: { id, user_id },
      });

      if (!transaction) {
        return res
          .status(404)
          .json({ success: false, error: "Transaction not found" });
      }

      await transaction.update({
        amount,
        category_id,
        description,
        merchant_name,
        transaction_date,
      });

      res.json({ success: true, data: transaction });
    } catch (error) {
      console.error("Update transaction error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to update transaction" });
    }
  }

  async deleteTransaction(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.user.id;

      const transaction = await Transaction.findOne({
        where: { id, user_id },
      });

      if (!transaction) {
        return res
          .status(404)
          .json({ success: false, error: "Transaction not found" });
      }

      await transaction.destroy();
      res.json({ success: true, message: "Transaction deleted successfully" });
    } catch (error) {
      console.error("Delete transaction error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to delete transaction" });
    }
  }

  async processReceipt(req, res) {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "No image file provided" });
      }

      const user_id = req.user.id;
      const imageUrl = req.file.path;

      // Extract text using OCR
      const ocrResult = await ocrService.extractTextFromImage(imageUrl);

      // Parse receipt data
      const receiptData = receiptParser.parseReceipt(
        ocrResult.text,
        ocrResult.lines
      );

      // Create transaction
      const transaction = await Transaction.create({
        user_id,
        amount: receiptData.amount,
        category_id: receiptData.category_id,
        description: receiptData.description,
        merchant_name: receiptData.merchant,
        transaction_date: receiptData.date,
        receipt_image_url: imageUrl,
        ocr_confidence: ocrResult.confidence,
        is_manual: false,
      });

      res.status(201).json({
        success: true,
        data: transaction,
        ocr_confidence: ocrResult.confidence,
      });
    } catch (error) {
      console.error("Process receipt error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to process receipt" });
    }
  }

  async getTransactionStats(req, res) {
    try {
      const user_id = req.user.id;
      const { period = "monthly" } = req.query;

      const stats = await budgetEngine.generateWeeklyReport(user_id);
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error("Get transaction stats error:", error);
      res
        .status(500)
        .json({
          success: false,
          error: "Failed to get transaction statistics",
        });
    }
  }
}

module.exports = new TransactionController();
