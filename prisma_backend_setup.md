# Finance Bot Backend Setup with Prisma ORM

## 🚀 Project Initialization

### 1. Initialize the Project
```bash
mkdir finance-tracking-bot
cd finance-tracking-bot
npm init -y

# Install core dependencies
npm install express prisma @prisma/client discord.js dotenv cors helmet
npm install @google-cloud/vision sharp multer node-cron bcryptjs jsonwebtoken

# Install development dependencies
npm install -D nodemon @types/node typescript ts-node jest supertest
```

### 2. Project Structure Setup
```bash
mkdir -p src/{controllers,services,middleware,utils,config}
mkdir -p src/bot/{commands,events}
mkdir -p prisma/{migrations,seeds}
mkdir -p uploads/receipts
mkdir -p tests/{unit,integration}
```

## 📁 Complete Project Structure
```
finance-tracking-bot/
├── src/
│   ├── controllers/
│   │   ├── transactionController.js
│   │   ├── budgetController.js
│   │   ├── categoryController.js
│   │   └── userController.js
│   ├── services/
│   │   ├── ocrService.js
│   │   ├── receiptParser.js
│   │   ├── budgetEngine.js
│   │   ├── notificationService.js
│   │   └── transactionService.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validation.js
│   │   ├── errorHandler.js
│   │   └── upload.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── helpers.js
│   │   └── validators.js
│   ├── config/
│   │   ├── database.js
│   │   ├── discord.js
│   │   └── app.js
│   ├── bot/
│   │   ├── index.js
│   │   ├── commands/
│   │   └── events/
│   └── app.js
├── prisma/
│   ├── schema.prisma
│   ├── seeds/
│   │   ├── categories.js
│   │   └── users.js
│   └── migrations/
├── uploads/
├── tests/
├── .env
├── .gitignore
├── package.json
└── README.md
```

## 🗄️ Prisma Schema Design

### 1. Initialize Prisma
```bash
npx prisma init
```

### 2. Configure Database URL
```bash
# .env
DATABASE_URL="postgresql://username:password@localhost:5432/finance_bot?schema=public"
DISCORD_TOKEN="your_discord_bot_token"
GOOGLE_VISION_KEY_PATH="./credentials/google-vision.json"
JWT_SECRET="your_jwt_secret_key"
PORT=3000
NODE_ENV="development"
```

### 3. Complete Prisma Schema
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id          Int      @id @default(autoincrement())
  discordId   String   @unique @map("discord_id")
  username    String
  email       String?  @unique
  timezone    String   @default("UTC")
  currency    String   @default("USD")
  isActive    Boolean  @default(true) @map("is_active")
  preferences Json?    // Store user preferences as JSON
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  transactions Transaction[]
  budgets      Budget[]
  categories   Category[]
  notifications Notification[]

  @@map("users")
}

model Category {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  color       String?  // Hex color code
  emoji       String?
  icon        String?
  isDefault   Boolean  @default(false) @map("is_default")
  isActive    Boolean  @default(true) @map("is_active")
  userId      Int?     @map("user_id") // null for default categories
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  user         User?         @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions Transaction[]
  budgets      Budget[]

  @@unique([name, userId]) // Prevent duplicate category names per user
  @@map("categories")
}

model Transaction {
  id                Int      @id @default(autoincrement())
  userId            Int      @map("user_id")
  categoryId        Int      @map("category_id")
  amount            Decimal  @db.Decimal(10, 2)
  currency          String   @default("USD")
  description       String?
  merchantName      String?  @map("merchant_name")
  transactionDate   DateTime @map("transaction_date")
  receiptImageUrl   String?  @map("receipt_image_url")
  receiptImagePath  String?  @map("receipt_image_path") // Local file path
  ocrText           String?  @map("ocr_text") // Raw OCR text
  ocrConfidence     Float?   @map("ocr_confidence")
  isManual          Boolean  @default(false) @map("is_manual")
  isRecurring       Boolean  @default(false) @map("is_recurring")
  recurringPattern  String?  @map("recurring_pattern") // monthly, weekly, etc.
  tags              String[] // Array of tags
  notes             String?
  location          String?
  isDeleted         Boolean  @default(false) @map("is_deleted")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  // Relations
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id])
  items    TransactionItem[]

  @@index([userId, transactionDate])
  @@index([categoryId])
  @@index([merchantName])
  @@map("transactions")
}

model TransactionItem {
  id            Int     @id @default(autoincrement())
  transactionId Int     @map("transaction_id")
  name          String
  quantity      Int     @default(1)
  unitPrice     Decimal @db.Decimal(10, 2) @map("unit_price")
  totalPrice    Decimal @db.Decimal(10, 2) @map("total_price")
  category      String?
  sku           String?

  // Relations
  transaction Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)

  @@map("transaction_items")
}

model Budget {
  id          Int      @id @default(autoincrement())
  userId      Int      @map("user_id")
  categoryId  Int      @map("category_id")
  name        String?  // Optional budget name
  amount      Decimal  @db.Decimal(10, 2)
  currency    String   @default("USD")
  periodType  String   @map("period_type") // weekly, monthly, quarterly, yearly
  startDate   DateTime @map("start_date")
  endDate     DateTime @map("end_date")
  isActive    Boolean  @default(true) @map("is_active")
  alertThreshold Float @default(0.8) @map("alert_threshold") // Alert at 80%
  isRollover  Boolean  @default(false) @map("is_rollover") // Rollover unused budget
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id])

  @@unique([userId, categoryId, periodType]) // One budget per category per period
  @@map("budgets")
}

model Notification {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  type      String   // budget_alert, weekly_report, monthly_summary
  title     String
  message   String
  data      Json?    // Additional data as JSON
  isRead    Boolean  @default(false) @map("is_read")
  isSent    Boolean  @default(false) @map("is_sent")
  sentAt    DateTime? @map("sent_at")
  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@map("notifications")
}

model Settings {
  id    Int    @id @default(autoincrement())
  key   String @unique
  value String
  description String?

  @@map("settings")
}

// For tracking receipt processing jobs
model ReceiptJob {
  id          Int      @id @default(autoincrement())
  userId      Int      @map("user_id")
  imageUrl    String   @map("image_url")
  imagePath   String?  @map("image_path")
  status      String   @default("pending") // pending, processing, completed, failed
  ocrText     String?  @map("ocr_text")
  parsedData  Json?    @map("parsed_data")
  errorMessage String? @map("error_message")
  retryCount  Int      @default(0) @map("retry_count")
  completedAt DateTime? @map("completed_at")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([userId, status])
  @@map("receipt_jobs")
}
```

## 🔧 Database Configuration and Connection

### 1. Database Connection Service
```javascript
// src/config/database.js
const { PrismaClient } = require('@prisma/client');

class DatabaseService {
  constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      errorFormat: 'pretty',
    });
    
    this.connect();
  }

  async connect() {
    try {
      await this.prisma.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
    console.log('📴 Database disconnected');
  }

  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date() };
    }
  }

  // Transaction wrapper for complex operations
  async transaction(operations) {
    return await this.prisma.$transaction(operations);
  }

  getClient() {
    return this.prisma;
  }
}

// Singleton instance
const databaseService = new DatabaseService();

module.exports = databaseService;
```

### 2. Models with Business Logic
```javascript
// src/services/userService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class UserService {
  async createUser(userData) {
    try {
      const user = await prisma.user.create({
        data: {
          discordId: userData.discordId,
          username: userData.username,
          email: userData.email,
          timezone: userData.timezone || 'UTC',
          currency: userData.currency || 'USD',
          preferences: userData.preferences || {}
        },
        include: {
          categories: true
        }
      });

      // Create default categories for new user
      await this.createDefaultCategories(user.id);
      
      return user;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error('User already exists');
      }
      throw error;
    }
  }

  async findByDiscordId(discordId) {
    return await prisma.user.findUnique({
      where: { discordId },
      include: {
        categories: {
          where: { isActive: true }
        },
        budgets: {
          where: { isActive: true },
          include: { category: true }
        }
      }
    });
  }

  async updateUser(userId, updateData) {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });
  }

  async createDefaultCategories(userId) {
    const defaultCategories = [
      { name: 'Groceries', emoji: '🛒', color: '#4CAF50' },
      { name: 'Dining', emoji: '🍽️', color: '#FF9800' },
      { name: 'Transportation', emoji: '🚗', color: '#2196F3' },
      { name: 'Entertainment', emoji: '🎬', color: '#9C27B0' },
      { name: 'Shopping', emoji: '🛍️', color: '#E91E63' },
      { name: 'Healthcare', emoji: '⚕️', color: '#F44336' },
      { name: 'Utilities', emoji: '⚡', color: '#607D8B' },
      { name: 'Other', emoji: '📦', color: '#795548' }
    ];

    return await prisma.category.createMany({
      data: defaultCategories.map(cat => ({
        ...cat,
        userId,
        isDefault: true
      }))
    });
  }

  async getUserStats(userId) {
    const [transactionCount, totalSpent, categoriesCount] = await Promise.all([
      prisma.transaction.count({
        where: { userId, isDeleted: false }
      }),
      prisma.transaction.aggregate({
        where: { userId, isDeleted: false },
        _sum: { amount: true }
      }),
      prisma.category.count({
        where: { userId, isActive: true }
      })
    ]);

    return {
      transactionCount,
      totalSpent: totalSpent._sum.amount || 0,
      categoriesCount
    };
  }
}

module.exports = new UserService();
```

### 3. Transaction Service
```javascript
// src/services/transactionService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class TransactionService {
  async createTransaction(transactionData) {
    try {
      const transaction = await prisma.transaction.create({
        data: {
          userId: transactionData.userId,
          categoryId: transactionData.categoryId,
          amount: transactionData.amount,
          currency: transactionData.currency || 'USD',
          description: transactionData.description,
          merchantName: transactionData.merchantName,
          transactionDate: transactionData.transactionDate || new Date(),
          receiptImageUrl: transactionData.receiptImageUrl,
          receiptImagePath: transactionData.receiptImagePath,
          ocrText: transactionData.ocrText,
          ocrConfidence: transactionData.ocrConfidence,
          isManual: transactionData.isManual || false,
          tags: transactionData.tags || [],
          notes: transactionData.notes,
          location: transactionData.location
        },
        include: {
          category: true,
          user: true
        }
      });

      // Create transaction items if provided
      if (transactionData.items && transactionData.items.length > 0) {
        await this.createTransactionItems(transaction.id, transactionData.items);
      }

      return transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  async createTransactionItems(transactionId, items) {
    const itemsData = items.map(item => ({
      transactionId,
      name: item.name,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || item.price,
      totalPrice: item.totalPrice || (item.price * (item.quantity || 1)),
      category: item.category,
      sku: item.sku
    }));

    return await prisma.transactionItem.createMany({
      data: itemsData
    });
  }

  async getTransactions(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      categoryId,
      startDate,
      endDate,
      searchTerm,
      sortBy = 'transactionDate',
      sortOrder = 'desc'
    } = options;

    const where = {
      userId,
      isDeleted: false,
      ...(categoryId && { categoryId }),
      ...(startDate && endDate && {
        transactionDate: {
          gte: startDate,
          lte: endDate
        }
      }),
      ...(searchTerm && {
        OR: [
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { merchantName: { contains: searchTerm, mode: 'insensitive' } },
          { notes: { contains: searchTerm, mode: 'insensitive' } }
        ]
      })
    };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: true,
          items: true
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.transaction.count({ where })
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getTransactionById(transactionId, userId) {
    return await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
        isDeleted: false
      },
      include: {
        category: true,
        items: true
      }
    });
  }

  async updateTransaction(transactionId, userId, updateData) {
    return await prisma.transaction.update({
      where: {
        id: transactionId,
        userId
      },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        category: true,
        items: true
      }
    });
  }

  async deleteTransaction(transactionId, userId) {
    return await prisma.transaction.update({
      where: {
        id: transactionId,
        userId
      },
      data: {
        isDeleted: true,
        updatedAt: new Date()
      }
    });
  }

  async getSpendingByCategory(userId, startDate, endDate) {
    return await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        isDeleted: false,
        transactionDate: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });
  }

  async getMonthlySpending(userId, year) {
    const result = await prisma.$queryRaw`
      SELECT 
        EXTRACT(MONTH FROM transaction_date) as month,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions 
      WHERE user_id = ${userId} 
        AND EXTRACT(YEAR FROM transaction_date) = ${year}
        AND is_deleted = false
      GROUP BY EXTRACT(MONTH FROM transaction_date)
      ORDER BY month
    `;

    return result.map(row => ({
      month: parseInt(row.month),
      total: parseFloat(row.total),
      count: parseInt(row.count)
    }));
  }

  async getTopMerchants(userId, limit = 10, startDate, endDate) {
    return await prisma.transaction.groupBy({
      by: ['merchantName'],
      where: {
        userId,
        isDeleted: false,
        merchantName: { not: null },
        ...(startDate && endDate && {
          transactionDate: {
            gte: startDate,
            lte: endDate
          }
        })
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          amount: 'desc'
        }
      },
      take: limit
    });
  }

  async getRecentTransactions(userId, limit = 5) {
    return await prisma.transaction.findMany({
      where: {
        userId,
        isDeleted: false
      },
      include: {
        category: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });
  }
}

module.exports = new TransactionService();
```

### 4. Budget Service
```javascript
// src/services/budgetService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class BudgetService {
  async createBudget(budgetData) {
    return await prisma.budget.create({
      data: {
        userId: budgetData.userId,
        categoryId: budgetData.categoryId,
        name: budgetData.name,
        amount: budgetData.amount,
        currency: budgetData.currency || 'USD',
        periodType: budgetData.periodType,
        startDate: budgetData.startDate,
        endDate: budgetData.endDate,
        alertThreshold: budgetData.alertThreshold || 0.8,
        isRollover: budgetData.isRollover || false
      },
      include: {
        category: true
      }
    });
  }

  async getBudgets(userId, isActive = true) {
    return await prisma.budget.findMany({
      where: {
        userId,
        isActive
      },
      include: {
        category: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async getBudgetStatus(userId, budgetId = null) {
    const where = {
      userId,
      isActive: true,
      ...(budgetId && { id: budgetId })
    };

    const budgets = await prisma.budget.findMany({
      where,
      include: {
        category: true
      }
    });

    const budgetStatus = [];

    for (const budget of budgets) {
      const spent = await this.getSpentAmount(userId, budget.categoryId, budget.startDate, budget.endDate);
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
        daysRemaining: this.getDaysRemaining(budget.endDate)
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
          lte: endDate
        }
      },
      _sum: {
        amount: true
      }
    });

    return parseFloat(result._sum.amount) || 0;
  }

  getBudgetStatusLevel(percentage) {
    if (percentage < 50) return 'good';
    if (percentage < 80) return 'warning';
    if (percentage < 100) return 'danger';
    return 'over';
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
        userId
      },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        category: true
      }
    });
  }

  async deleteBudget(budgetId, userId) {
    return await prisma.budget.update({
      where: {
        id: budgetId,
        userId
      },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });
  }

  async generateBudgetReport(userId, periodType = 'monthly') {
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
            lte: endDate
          }
        }
      })
    ]);

    const totalBudgeted = budgetStatus.reduce((sum, budget) => sum + budget.budgeted, 0);
    const overBudgetCategories = budgetStatus.filter(b => b.isOverBudget);

    return {
      period: { startDate, endDate, type: periodType },
      summary: {
        totalBudgeted,
        totalSpent,
        remaining: totalBudgeted - totalSpent,
        transactionCount
      },
      budgetStatus,
      overBudgetCategories,
      recommendations: this.generateRecommendations(budgetStatus)
    };
  }

  getPeriodDates(periodType) {
    const now = new Date();
    let startDate, endDate;

    switch (periodType) {
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        endDate = new Date(now.setDate(startDate.getDate() + 6));
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        throw new Error('Invalid period type');
    }

    return { startDate, endDate };
  }

  generateRecommendations(budgetStatus) {
    const recommendations = [];

    budgetStatus.forEach(budget => {
      if (budget.percentage > 100) {
        recommendations.push({
          type: 'over_budget',
          category: budget.category,
          message: `You've exceeded your ${budget.category} budget by $${Math.abs(budget.remaining).toFixed(2)}`
        });
      } else if (budget.percentage > 80) {
        recommendations.push({
          type: 'approaching_limit',
          category: budget.category,
          message: `You're close to your ${budget.category} budget limit with ${budget.daysRemaining} days remaining`
        });
      }
    });

    return recommendations;
  }
}

module.exports = new BudgetService();
```

## 🗃️ Database Migrations and Seeds

### 1. Run Initial Migration
```bash
# Generate and run migration
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate
```

### 2. Seed Default Data
```javascript
// prisma/seeds/defaultCategories.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const defaultCategories = [
  {
    name: 'Groceries',
    description: 'Food and grocery shopping',
    emoji: '🛒',
    color: '#4CAF50',
    isDefault: true
  },
  {
    name: 'Dining',
    description: 'Restaurants and food delivery',
    emoji: '🍽️',
    color: '#FF9800',
    isDefault: true
  },
  {
    name: 'Transportation',
    description: 'Gas, public transport, rideshare',
    emoji: '🚗',
    color: '#2196F3',
    isDefault: true
  },
  {
    name: 'Entertainment',
    description: 'Movies, games, hobbies',
    emoji: '🎬',
    color: '#9C27B0',
    isDefault: true
  },
  {
    name: 'Shopping',
    description: 'Clothing, electronics, general shopping',
    emoji: '🛍️',
    color: '#E91E63',
    isDefault: true
  },
  {
    name: 'Healthcare',
    description: 'Medical expenses, pharmacy',
    emoji: '⚕️',
    color: '#F44336',
    isDefault: true
  },
  {
    name: 'Utilities',
    description: 'Electricity, water, internet, phone',
    emoji: '⚡',
    color: '#607D8B',
    isDefault: true
  },
  {
    name: 'Education',
    description: 'Books, courses, school supplies',
    emoji: '📚',
    color: '#009688',
    isDefault: true
  },
  {
    name: 'Travel',
    description: 'Vacation, business trips',
    emoji: '✈️',
    color: '#FF5722',
    isDefault: true
  },
  {
    name: 'Other',
    description: 'Miscellaneous expenses',
    emoji: '📦',
    color: '#795548',
    isDefault: true
  }
];

async function seedDefaultCategories() {
  console.log('🌱 Seeding default categories...');
  
  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: {
        name_userId: {
          name: category.name,
          userId: null
        }
      },
      update: category,
      create: category
    });
  }
  
  console.log('✅ Default categories seeded successfully');
}

module.exports = { seedDefaultCategories, defaultCategories };
```

### 3. Main Seed File
```javascript
// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const { seedDefaultCategories } = require('./seeds/defaultCategories');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');
  
  try {
    await seedDefaultCategories();
    
    // Add any other seed operations here
    
    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 4. Package.json Scripts
```json
{
  "scripts": {
    "dev": "nodemon src/app.js",
    "start": "node src/app.js",
    "db:migrate": "npx prisma migrate dev",
    "db:generate": "npx prisma generate",
    "db:seed": "node prisma/seed.js",
    "db:reset": "npx prisma migrate reset --force",
    "db:studio": "npx prisma studio",
    "db:deploy": "npx prisma migrate deploy",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

## 🚀 Express Server Setup

### 1. Main Application File
```javascript
// src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const databaseService = require('./config/database');

// Import routes
const transactionRoutes = require('./routes/transactions');
const budgetRoutes = require('./routes/budgets');
const categoryRoutes = require('./routes/categories');
const userRoutes = require('./routes/users');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbHealth = await databaseService.healthCheck();
  res.json({
    status: 'ok',
    timestamp: new Date(),
    database: dbHealth,
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await databaseService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await databaseService.disconnect();
  process.exit(0);
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🗄️  Database Studio: http://localhost:5555`);
  });
}

module.exports = app;
```

## 🎯 Getting Started Commands

### 1. Complete Setup Script
```bash
#!/bin/bash
# setup.sh

echo "🚀 Setting up Finance Tracking Bot Backend..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup environment
echo "⚙️  Setting up environment..."
cp .env.example .env
echo "Please edit .env with your database and API credentials"

# Setup database
echo "🗄️  Setting up database..."
npx prisma migrate dev --name init
npx prisma generate
npm run db:seed

echo "✅ Setup complete!"
echo "Run 'npm run dev' to start the development server"
echo "Run 'npm run db:studio' to open Prisma Studio"
```

### 2. Development Commands
```bash
# Start development server
npm run dev

# Database operations
npm run db:migrate    # Run migrations
npm run db:generate   # Generate Prisma client
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
npm run db:reset     # Reset database (careful!)

# Production deployment
npm run db:deploy    # Deploy migrations to production
npm start           # Start production server
```

This backend setup provides a solid foundation with Prisma ORM, proper database modeling, comprehensive services, and ready-to-use APIs. The structure is scalable and follows best practices for Node.js applications.

Next, we can implement the Discord bot integration or the OCR services! Which would you like to tackle next?