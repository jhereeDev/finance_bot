const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const categoryController = require("../controllers/categoryController");

// Apply authentication middleware to all routes
router.use(auth);

// Category routes
router.post("/", categoryController.createCategory);
router.get("/", categoryController.getCategories);
router.get("/:id/stats", categoryController.getCategoryStats);
router.put("/:id", categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);

module.exports = router;
