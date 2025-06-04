const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const userController = require("../controllers/userController");

// Public routes
router.post("/register", userController.register);
router.post("/login", userController.login);

// Protected routes
router.use(auth);
router.get("/profile", userController.getProfile);
router.put("/profile", userController.updateProfile);
router.put("/change-password", userController.changePassword);
router.delete("/account", userController.deleteAccount);

module.exports = router;
