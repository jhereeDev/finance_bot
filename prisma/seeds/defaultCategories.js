const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const defaultCategories = [
  {
    name: "Groceries",
    description: "Food and grocery shopping",
    emoji: "🛒",
    color: "#4CAF50",
    isDefault: true,
  },
  {
    name: "Dining",
    description: "Restaurants and food delivery",
    emoji: "🍽️",
    color: "#FF9800",
    isDefault: true,
  },
  {
    name: "Transportation",
    description: "Gas, public transport, rideshare",
    emoji: "🚗",
    color: "#2196F3",
    isDefault: true,
  },
  {
    name: "Entertainment",
    description: "Movies, games, hobbies",
    emoji: "🎬",
    color: "#9C27B0",
    isDefault: true,
  },
  {
    name: "Shopping",
    description: "Clothing, electronics, general shopping",
    emoji: "🛍️",
    color: "#E91E63",
    isDefault: true,
  },
  {
    name: "Healthcare",
    description: "Medical expenses, pharmacy",
    emoji: "⚕️",
    color: "#F44336",
    isDefault: true,
  },
  {
    name: "Utilities",
    description: "Electricity, water, internet, phone",
    emoji: "⚡",
    color: "#607D8B",
    isDefault: true,
  },
  {
    name: "Education",
    description: "Books, courses, school supplies",
    emoji: "📚",
    color: "#009688",
    isDefault: true,
  },
  {
    name: "Travel",
    description: "Vacation, business trips",
    emoji: "✈️",
    color: "#FF5722",
    isDefault: true,
  },
  {
    name: "Other",
    description: "Miscellaneous expenses",
    emoji: "📦",
    color: "#795548",
    isDefault: true,
  },
];

async function seedDefaultCategories() {
  console.log("🌱 Seeding default categories...");

  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: {
        name_userId: {
          name: category.name,
          userId: null,
        },
      },
      update: category,
      create: category,
    });
  }

  console.log("✅ Default categories seeded successfully");
}

module.exports = { seedDefaultCategories, defaultCategories };
