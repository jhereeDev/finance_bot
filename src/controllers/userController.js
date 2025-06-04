const { User } = require("../models");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

class UserController {
  async register(req, res) {
    try {
      const { username, email, password, discordId } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: "User already exists with this email",
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const user = await User.create({
        username,
        email,
        password: hashedPassword,
        discordId,
      });

      // Generate token
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
      });

      res.status(201).json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          token,
        },
      });
    } catch (error) {
      console.error("Register error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to register user" });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({
        where: { email },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials",
        });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials",
        });
      }

      // Generate token
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
      });

      res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          token,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ success: false, error: "Failed to login" });
    }
  }

  async getProfile(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ["password"] },
      });

      res.json({ success: true, data: user });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({ success: false, error: "Failed to get profile" });
    }
  }

  async updateProfile(req, res) {
    try {
      const { username, email, timezone, currency } = req.body;
      const user = await User.findByPk(req.user.id);

      // Update fields
      if (username) user.username = username;
      if (email) user.email = email;
      if (timezone) user.timezone = timezone;
      if (currency) user.currency = currency;

      await user.save();

      res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          timezone: user.timezone,
          currency: user.currency,
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to update profile" });
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findByPk(req.user.id);

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: "Current password is incorrect",
        });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password
      user.password = hashedPassword;
      await user.save();

      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to change password" });
    }
  }

  async deleteAccount(req, res) {
    try {
      const user = await User.findByPk(req.user.id);
      await user.destroy();

      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Delete account error:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to delete account" });
    }
  }
}

module.exports = new UserController();
