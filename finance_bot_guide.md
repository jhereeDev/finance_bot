# Finance Tracking Discord Bot - Complete Architecture & Implementation Guide

## 🏗️ System Architecture

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Discord Bot   │────│  Image Storage  │    │   OCR Service   │
│   (discord.js)  │    │ (local/cloud)   │    │ (Vision API)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Main Server    │────│    Database     │    │ Receipt Parser  │
│  (Express.js)   │    │ (PostgreSQL)    │    │   (Custom)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Budget Engine   │    │ Notification    │    │  Web Dashboard  │
│    (Custom)     │    │   Service       │    │   (Optional)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Features Overview

### Core Features

- **Receipt Image Processing**: Upload photos via Discord, automatic OCR extraction
- **Smart Categorization**: AI-powered expense category detection
- **Budget Tracking**: Set monthly/weekly budgets per category
- **Weekly Reports**: Automated spending summaries sent to Discord
- **Manual Corrections**: Edit transactions via Discord commands
- **Multi-Receipt Support**: Handle both physical and digital receipts

### Advanced Features

- **Spending Analytics**: Trends and patterns analysis
- **Budget Alerts**: Real-time notifications when approaching limits
- **Recurring Expenses**: Automatic detection of subscription services
- **Multi-Currency Support**: Handle different currencies
- **Export Data**: Generate CSV reports
- **Voice Commands**: Process voice messages for quick entries

## 🛠️ Technology Stack

### Backend

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Discord API**: discord.js v14
- **OCR Service**: Google Cloud Vision API
- **Image Processing**: Sharp.js
- **Task Scheduling**: node-cron
- **Authentication**: JWT (for web dashboard)

### External Services

- **OCR**: Google Cloud Vision API (recommended) or AWS Textract
- **Image Storage**: AWS S3 or local filesystem
- **Hosting**: Railway, Heroku, or VPS

## 📁 Project Structure

```
finance-tracking-bot/
├── src/
│   ├── bot/
│   │   ├── commands/
│   │   │   ├── budget.js
│   │   │   ├── categories.js
│   │   │   ├── export.js
│   │   │   └── help.js
│   │   ├── events/
│   │   │   ├── messageCreate.js
│   │   │   └── ready.js
│   │   └── index.js
│   ├── services/
│   │   ├── ocrService.js
│   │   ├── receiptParser.js
│   │   ├── budgetEngine.js
│   │   ├── notificationService.js
│   │   └── imageProcessor.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Transaction.js
│   │   ├── Budget.js
│   │   └── Category.js
│   ├── database/
│   │   ├── connection.js
│   │   ├── migrations/
│   │   └── seeds/
│   ├── utils/
│   │   ├── logger.js
│   │   ├── validators.js
│   │   └── helpers.js
│   ├── web/
│   │   ├── routes/
│   │   ├── controllers/
│   │   └── middleware/
│   └── config/
│       ├── database.js
│       ├── discord.js
│       └── environment.js
├── public/
│   └── uploads/
├── tests/
├── docs/
├── package.json
├── docker-compose.yml
└── README.md
```

## 🗄️ Database Schema

### Users Table

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    discord_id VARCHAR(20) UNIQUE NOT NULL,
    username VARCHAR(50) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Categories Table

```sql
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7), -- Hex color code
    emoji VARCHAR(10),
    is_default BOOLEAN DEFAULT false,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Transactions Table

```sql
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    category_id INTEGER REFERENCES categories(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    merchant_name VARCHAR(100),
    transaction_date DATE NOT NULL,
    receipt_image_url VARCHAR(255),
    ocr_confidence DECIMAL(3,2),
    is_manual BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Budgets Table

```sql
CREATE TABLE budgets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    category_id INTEGER REFERENCES categories(id),
    amount DECIMAL(10,2) NOT NULL,
    period_type VARCHAR(20) DEFAULT 'monthly', -- weekly, monthly, yearly
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🤖 Discord Bot Implementation

### Core Bot Setup

```javascript
// src/bot/index.js
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");

class FinanceBot {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    this.commands = new Collection();
    this.loadCommands();
    this.loadEvents();
  }

  loadCommands() {
    const commandsPath = path.join(__dirname, "commands");
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, file));
      this.commands.set(command.name, command);
    }
  }

  loadEvents() {
    const eventsPath = path.join(__dirname, "events");
    const eventFiles = fs
      .readdirSync(eventsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of eventFiles) {
      const event = require(path.join(eventsPath, file));
      if (event.once) {
        this.client.once(event.name, (...args) => event.execute(...args));
      } else {
        this.client.on(event.name, (...args) => event.execute(...args));
      }
    }
  }

  start(token) {
    this.client.login(token);
  }
}

module.exports = FinanceBot;
```

### Message Handler for Receipt Images

```javascript
// src/bot/events/messageCreate.js
const { receiptProcessor } = require("../../services/receiptProcessor");
const { isImageAttachment } = require("../../utils/helpers");

module.exports = {
  name: "messageCreate",
  async execute(message) {
    if (message.author.bot) return;

    // Handle receipt images
    if (message.attachments.size > 0) {
      const imageAttachment = message.attachments.find((att) =>
        isImageAttachment(att)
      );
      if (imageAttachment) {
        await handleReceiptUpload(message, imageAttachment);
        return;
      }
    }

    // Handle commands
    if (!message.content.startsWith("!finance")) return;

    const args = message.content.slice(9).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = message.client.commands.get(commandName);
    if (!command) return;

    try {
      await command.execute(message, args);
    } catch (error) {
      console.error(error);
      await message.reply("There was an error executing this command!");
    }
  },
};

async function handleReceiptUpload(message, attachment) {
  try {
    await message.react("⏳"); // Processing indicator

    const result = await receiptProcessor.processReceipt(
      attachment.url,
      message.author.id
    );

    if (result.success) {
      await message.react("✅");
      await message.reply({
        embeds: [
          {
            title: "🧾 Receipt Processed Successfully!",
            color: 0x00ff00,
            fields: [
              {
                name: "Amount",
                value: `$${result.transaction.amount}`,
                inline: true,
              },
              {
                name: "Merchant",
                value: result.transaction.merchant || "Unknown",
                inline: true,
              },
              {
                name: "Category",
                value: result.transaction.category,
                inline: true,
              },
              {
                name: "Confidence",
                value: `${(result.confidence * 100).toFixed(1)}%`,
                inline: true,
              },
            ],
            footer: { text: "Use !finance edit to make corrections" },
          },
        ],
      });
    } else {
      await message.react("❌");
      await message.reply(`Failed to process receipt: ${result.error}`);
    }
  } catch (error) {
    console.error("Receipt processing error:", error);
    await message.react("❌");
    await message.reply("Failed to process the receipt. Please try again.");
  }
}
```

## 🔍 OCR Service Implementation

### Google Vision API Integration

```javascript
// src/services/ocrService.js
const vision = require("@google-cloud/vision");

class OCRService {
  constructor() {
    this.client = new vision.ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_VISION_KEY_PATH,
    });
  }

  async extractTextFromImage(imageUrl) {
    try {
      const [result] = await this.client.textDetection(imageUrl);
      const detections = result.textAnnotations;

      if (!detections || detections.length === 0) {
        throw new Error("No text detected in image");
      }

      const fullText = detections[0].description;
      const confidence = this.calculateConfidence(detections);

      return {
        text: fullText,
        confidence: confidence,
        lines: this.extractLines(detections.slice(1)),
      };
    } catch (error) {
      console.error("OCR Error:", error);
      throw new Error("Failed to extract text from image");
    }
  }

  calculateConfidence(detections) {
    if (!detections || detections.length === 0) return 0;

    // Calculate average confidence from bounding box data
    const confidences = detections.slice(1).map((detection) => {
      // Implement confidence calculation based on bounding box stability
      return 0.85; // Placeholder
    });

    return confidences.reduce((a, b) => a + b, 0) / confidences.length;
  }

  extractLines(detections) {
    // Group text by lines based on Y coordinates
    const lines = [];
    const lineGroups = {};

    detections.forEach((detection) => {
      const y = detection.boundingPoly.vertices[0].y;
      const lineKey = Math.round(y / 10) * 10; // Group by proximity

      if (!lineGroups[lineKey]) {
        lineGroups[lineKey] = [];
      }
      lineGroups[lineKey].push(detection.description);
    });

    Object.keys(lineGroups)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach((key) => {
        lines.push(lineGroups[key].join(" "));
      });

    return lines;
  }
}

module.exports = new OCRService();
```

## 🧮 Receipt Parser Implementation

### Smart Receipt Data Extraction

```javascript
// src/services/receiptParser.js
class ReceiptParser {
  constructor() {
    this.patterns = {
      total: [
        /total[:\s]*\$?(\d+\.?\d*)/i,
        /amount[:\s]*\$?(\d+\.?\d*)/i,
        /sum[:\s]*\$?(\d+\.?\d*)/i,
      ],
      date: [
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
        /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,
        /(\w{3}\s+\d{1,2},?\s+\d{4})/i,
      ],
      merchant: [
        /^([A-Z\s&]{3,})/m, // First line often contains merchant name
        /thank you for shopping at\s*([^\\n]+)/i,
      ],
      items: /(.+?)\s+\$?(\d+\.?\d*)/g,
    };

    this.categoryRules = this.loadCategoryRules();
  }

  parseReceipt(ocrText, lines) {
    const result = {
      amount: this.extractAmount(ocrText),
      date: this.extractDate(ocrText),
      merchant: this.extractMerchant(lines),
      items: this.extractItems(ocrText),
      category: null,
    };

    // Determine category based on merchant and items
    result.category = this.categorizeTransaction(result.merchant, result.items);

    return result;
  }

  extractAmount(text) {
    for (const pattern of this.patterns.total) {
      const match = text.match(pattern);
      if (match) {
        return parseFloat(match[1]);
      }
    }

    // Fallback: find largest monetary amount
    const amounts = text.match(/\$?(\d+\.\d{2})/g);
    if (amounts) {
      const values = amounts.map((amt) => parseFloat(amt.replace("$", "")));
      return Math.max(...values);
    }

    return null;
  }

  extractDate(text) {
    for (const pattern of this.patterns.date) {
      const match = text.match(pattern);
      if (match) {
        return new Date(match[1]);
      }
    }
    return new Date(); // Default to today
  }

  extractMerchant(lines) {
    // Usually the first substantial line
    for (const line of lines.slice(0, 3)) {
      if (line.length > 3 && line.length < 50) {
        return line.trim();
      }
    }
    return "Unknown Merchant";
  }

  extractItems(text) {
    const items = [];
    let match;

    while ((match = this.patterns.items.exec(text)) !== null) {
      items.push({
        name: match[1].trim(),
        price: parseFloat(match[2]),
      });
    }

    return items;
  }

  categorizeTransaction(merchant, items) {
    const merchantLower = merchant.toLowerCase();

    // Check merchant-based rules
    for (const [category, keywords] of Object.entries(
      this.categoryRules.merchants
    )) {
      if (keywords.some((keyword) => merchantLower.includes(keyword))) {
        return category;
      }
    }

    // Check item-based rules
    const itemNames = items.map((item) => item.name.toLowerCase()).join(" ");
    for (const [category, keywords] of Object.entries(
      this.categoryRules.items
    )) {
      if (keywords.some((keyword) => itemNames.includes(keyword))) {
        return category;
      }
    }

    return "Other";
  }

  loadCategoryRules() {
    return {
      merchants: {
        Groceries: ["walmart", "target", "safeway", "kroger", "whole foods"],
        Gas: ["shell", "exxon", "chevron", "bp", "mobil"],
        Dining: ["restaurant", "cafe", "pizza", "subway", "mcdonald"],
        Shopping: ["amazon", "best buy", "macy", "nike", "apple store"],
        Transport: ["uber", "lyft", "taxi", "metro", "bus"],
      },
      items: {
        Groceries: ["milk", "bread", "eggs", "vegetables", "fruit"],
        Dining: ["burger", "pizza", "coffee", "drink", "meal"],
        Gas: ["gasoline", "fuel", "diesel"],
        Healthcare: ["pharmacy", "medicine", "prescription"],
      },
    };
  }
}

module.exports = new ReceiptParser();
```

## 📊 Budget Engine

### Budget Tracking and Analytics

```javascript
// src/services/budgetEngine.js
const { Transaction, Budget, Category } = require("../models");

class BudgetEngine {
  async getCurrentSpending(userId, categoryId = null, period = "monthly") {
    const { startDate, endDate } = this.getPeriodDates(period);

    const query = {
      user_id: userId,
      transaction_date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (categoryId) {
      query.category_id = categoryId;
    }

    const transactions = await Transaction.findAll({ where: query });
    return transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  }

  async getBudgetStatus(userId) {
    const budgets = await Budget.findAll({
      where: { user_id: userId, is_active: true },
      include: [Category],
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
        category: budget.Category.name,
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

    const transactions = await Transaction.findAll({
      where: {
        user_id: userId,
        transaction_date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: [Category],
      order: [["transaction_date", "DESC"]],
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
      const category = transaction.Category.name;
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
```

## 📅 Weekly Report System

### Automated Notification Service

```javascript
// src/services/notificationService.js
const cron = require("node-cron");
const { Client } = require("discord.js");
const { budgetEngine } = require("./budgetEngine");
const { User } = require("../models");

class NotificationService {
  constructor(discordClient) {
    this.client = discordClient;
    this.setupScheduledReports();
  }

  setupScheduledReports() {
    // Send weekly reports every Sunday at 9 AM
    cron.schedule("0 9 * * 0", async () => {
      await this.sendWeeklyReports();
    });

    // Send budget alerts daily at 6 PM
    cron.schedule("0 18 * * *", async () => {
      await this.sendBudgetAlerts();
    });
  }

  async sendWeeklyReports() {
    try {
      const users = await User.findAll();

      for (const user of users) {
        await this.sendWeeklyReportToUser(user);
      }
    } catch (error) {
      console.error("Error sending weekly reports:", error);
    }
  }

  async sendWeeklyReportToUser(user) {
    try {
      const report = await budgetEngine.generateWeeklyReport(user.id);
      const discordUser = await this.client.users.fetch(user.discord_id);

      const embed = this.createWeeklyReportEmbed(report);
      await discordUser.send({ embeds: [embed] });
    } catch (error) {
      console.error(`Error sending report to user ${user.discord_id}:`, error);
    }
  }

  createWeeklyReportEmbed(report) {
    const startDate = report.period.startDate.toLocaleDateString();
    const endDate = report.period.endDate.toLocaleDateString();

    const fields = [
      {
        name: "💰 Total Spent",
        value: `$${report.totalSpent.toFixed(2)}`,
        inline: true,
      },
      {
        name: "📝 Transactions",
        value: `${report.transactionCount}`,
        inline: true,
      },
    ];

    // Add category breakdown
    Object.entries(report.categoryBreakdown)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 5)
      .forEach(([category, data]) => {
        fields.push({
          name: `📊 ${category}`,
          value: `$${data.total.toFixed(2)} (${data.count} transactions)`,
          inline: true,
        });
      });

    // Add budget status
    const overBudgetCategories = report.budgetStatus.filter(
      (b) => b.percentage > 100
    );
    if (overBudgetCategories.length > 0) {
      fields.push({
        name: "⚠️ Over Budget",
        value: overBudgetCategories
          .map((b) => `${b.category}: ${b.percentage.toFixed(1)}%`)
          .join("\n"),
        inline: false,
      });
    }

    return {
      title: `📊 Weekly Finance Report (${startDate} - ${endDate})`,
      color: 0x0099ff,
      fields: fields,
      footer: {
        text: "Use !finance summary for more details",
      },
      timestamp: new Date(),
    };
  }

  async sendBudgetAlerts() {
    const users = await User.findAll();

    for (const user of users) {
      const budgetStatus = await budgetEngine.getBudgetStatus(user.id);
      const alerts = budgetStatus.filter((b) => b.percentage > 80);

      if (alerts.length > 0) {
        await this.sendBudgetAlert(user, alerts);
      }
    }
  }

  async sendBudgetAlert(user, alerts) {
    try {
      const discordUser = await this.client.users.fetch(user.discord_id);

      const embed = {
        title: "⚠️ Budget Alert",
        color: 0xff9900,
        description: "You're approaching or exceeding your budget limits:",
        fields: alerts.map((alert) => ({
          name: alert.category,
          value: `${alert.percentage.toFixed(1)}% of budget used ($${alert.spent.toFixed(2)} / $${alert.budgeted.toFixed(2)})`,
          inline: false,
        })),
        footer: {
          text: "Consider reviewing your spending in these categories",
        },
      };

      await discordUser.send({ embeds: [embed] });
    } catch (error) {
      console.error(
        `Error sending budget alert to user ${user.discord_id}:`,
        error
      );
    }
  }
}

module.exports = NotificationService;
```

## 🎯 Discord Commands

### Budget Management Commands

```javascript
// src/bot/commands/budget.js
const { budgetEngine } = require("../../services/budgetEngine");
const { Budget, Category } = require("../../models");

module.exports = {
  name: "budget",
  description: "Manage your budgets",
  async execute(message, args) {
    const subcommand = args[0]?.toLowerCase();

    switch (subcommand) {
      case "set":
        await setBudget(message, args.slice(1));
        break;
      case "view":
        await viewBudgets(message);
        break;
      case "status":
        await budgetStatus(message);
        break;
      default:
        await showBudgetHelp(message);
    }
  },
};

async function setBudget(message, args) {
  if (args.length < 2) {
    return message.reply(
      "Usage: `!finance budget set <category> <amount> [period]`"
    );
  }

  const [categoryName, amount, period = "monthly"] = args;

  try {
    // Find or create category
    let category = await Category.findOne({
      where: { name: categoryName, user_id: message.author.id },
    });

    if (!category) {
      category = await Category.create({
        name: categoryName,
        user_id: message.author.id,
      });
    }

    // Create or update budget
    const { startDate, endDate } = budgetEngine.getPeriodDates(period);

    await Budget.upsert({
      user_id: message.author.id,
      category_id: category.id,
      amount: parseFloat(amount),
      period_type: period,
      start_date: startDate,
      end_date: endDate,
      is_active: true,
    });

    await message.reply({
      embeds: [
        {
          title: "✅ Budget Set Successfully",
          color: 0x00ff00,
          fields: [
            { name: "Category", value: categoryName, inline: true },
            { name: "Amount", value: `$${amount}`, inline: true },
            { name: "Period", value: period, inline: true },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Budget set error:", error);
    await message.reply("Failed to set budget. Please try again.");
  }
}

async function viewBudgets(message) {
  try {
    const budgets = await Budget.findAll({
      where: { user_id: message.author.id, is_active: true },
      include: [Category],
    });

    if (budgets.length === 0) {
      return message.reply(
        "You haven't set any budgets yet. Use `!finance budget set` to create one."
      );
    }

    const fields = budgets.map((budget) => ({
      name: budget.Category.name,
      value: `$${budget.amount} (${budget.period_type})`,
      inline: true,
    }));

    await message.reply({
      embeds: [
        {
          title: "💰 Your Current Budgets",
          color: 0x0099ff,
          fields: fields,
        },
      ],
    });
  } catch (error) {
    console.error("View budgets error:", error);
    await message.reply("Failed to retrieve budgets.");
  }
}

async function budgetStatus(message) {
  try {
    const status = await budgetEngine.getBudgetStatus(message.author.id);

    if (status.length === 0) {
      return message.reply(
        "No active budgets found. Set a budget first with `!finance budget set`."
      );
    }

    const fields = status.map((item) => {
      const emoji =
        item.status === "green"
          ? "🟢"
          : item.status === "yellow"
            ? "🟡"
            : item.status === "orange"
              ? "🟠"
              : "🔴";

      return {
        name: `${emoji} ${item.category}`,
        value: `$${item.spent.toFixed(2)} / $${item.budgeted.toFixed(2)} (${item.percentage.toFixed(1)}%)`,
        inline: false,
      };
    });

    await message.reply({
      embeds: [
        {
          title: "📊 Budget Status",
          color: 0x0099ff,
          fields: fields,
          footer: {
            text: "🟢 Under 50% • 🟡 50-80% • 🟠 80-100% • 🔴 Over budget",
          },
        },
      ],
    });
  } catch (error) {
    console.error("Budget status error:", error);
    await message.reply("Failed to get budget status.");
  }
}
```

## 🚀 Setup and Installation Guide

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Discord Bot Token
- Google Cloud Vision API credentials

### Installation Steps

1. **Clone and Setup Project**

```bash
git clone <repository-url>
cd finance-tracking-bot
npm install express cors helmet compression morgan multer jsonwebtoken bcryptjs
```

2. **Environment Configuration**

```bash
# Create .env file
cp .env.example .env

# Edit .env with your values:
DISCORD_TOKEN=your_discord_bot_token
DATABASE_URL=postgresql://user:password@localhost:5432/finance_bot
GOOGLE_VISION_KEY_PATH=./credentials/google-vision.json
PORT=3000
NODE_ENV=development
```

3. **Database Setup**

```bash
# Install PostgreSQL and create database
createdb finance_bot

# Run migrations
npm run migrate

# Seed default categories
npm run seed
```

4. **Discord Bot Setup**

- Go to Discord Developer Portal
- Create new application and bot
- Copy bot token to .env
- Invite bot to your server with necessary permissions

5. **Google Vision API Setup**

- Create Google Cloud Project
- Enable Vision API
- Create service account and download JSON key
- Place key file in `./credentials/` directory

6. **Start the Application**

```bash
# Development
npm run dev

# Production
npm start
```

## 📱 Usage Examples

### Basic Commands

```
!finance help                    # Show all commands
!finance budget set Groceries 500  # Set monthly grocery budget
!finance budget status           # Check budget status
!finance summary                 # Weekly spending summary
!finance export csv              # Export transactions to CSV
```

### Receipt Processing

1. Upload receipt image to Discord channel
2. Bot automatically processes and extracts data
3. Bot responds with transaction details
4. Use `!finance edit <id>` to make corrections

### Setting Up Categories

```
!finance category add "Coffee" ☕ #8B4513
!finance category list
!finance category edit "Coffee" "Dining"
```

## 🔧 Configuration Options

### Custom OCR Settings

```javascript
// config/ocr.js
module.exports = {
  provider: "google", // 'google', 'aws', 'tesseract'
  confidence_threshold: 0.7,
  languages: ["en"],
  preprocessing: {
    enhance_contrast: true,
    deskew: true,
    remove_noise: true,
  },
};
```

### Notification Settings

```javascript
// config/notifications.js
module.exports = {
  weekly_reports: {
    enabled: true,
    day: "sunday",
    time: "09:00",
  },
  budget_alerts: {
    enabled: true,
    threshold: 80, // percentage
    frequency: "daily",
  },
};
```

## 🧪 Testing

### Test Structure

```bash
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:coverage      # Coverage report
```

### Sample Test

```javascript
// tests/services/receiptParser.test.js
const ReceiptParser = require("../src/services/receiptParser");

describe("ReceiptParser", () => {
  test("should extract amount from receipt text", () => {
    const text = "Total: $25.99";
    const result = ReceiptParser.extractAmount(text);
    expect(result).toBe(25.99);
  });
});
```

## 📈 Future Enhancements

### Phase 2 Features

- **Web Dashboard**: React-based web interface
- **Mobile App**: React Native companion app
- **AI Insights**: Spending pattern analysis
- **Multi-User**: Family/team budget sharing
- **Integrations**: Bank API connections
- **Voice Commands**: Audio expense logging

### Advanced Analytics

- Spending trend predictions
- Category optimization suggestions
- Bill reminder system
- Investment tracking integration

### Scaling Considerations

- Redis caching for performance
- Queue system for image processing
- Multi-server deployment
- Database sharding for large datasets

---

## 📞 Support and Maintenance

### Monitoring

- Application logs with Winston
- Discord bot uptime monitoring
- Database performance tracking
- Error reporting with Sentry

### Backup Strategy

- Daily database backups
- Image storage backup
- Configuration backup
- Disaster recovery plan

This comprehensive guide provides everything needed to build, deploy, and maintain your finance tracking Discord bot. Start with the core features and gradually add advanced functionality based on your needs!
