const request = require("supertest");
const app = require("../app");
const prisma = require("../models");

describe("API Tests", () => {
  let testUser;
  let testCategory;
  let testTransaction;
  let authToken;

  // Setup before tests
  beforeAll(async () => {
    // Create a test user
    testUser = await prisma.user.create({
      data: {
        discordId: "test123",
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      },
    });

    // Create a test category
    testCategory = await prisma.category.create({
      data: {
        name: "Test Category",
        user_id: testUser.id,
        is_default: true,
      },
    });

    // Login to get auth token
    const loginResponse = await request(app).post("/api/users/login").send({
      email: "test@example.com",
      password: "password123",
    });

    authToken = loginResponse.body.token;
  });

  // Cleanup after tests
  afterAll(async () => {
    // Delete test data
    await prisma.transaction.deleteMany({
      where: { user_id: testUser.id },
    });
    await prisma.category.deleteMany({
      where: { user_id: testUser.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    await prisma.$disconnect();
  });

  // Health check test
  describe("Health Check", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health");
      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
      expect(response.body.database).toBeDefined();
    });
  });

  // User tests
  describe("User Endpoints", () => {
    it("should register a new user", async () => {
      const response = await request(app).post("/api/users/register").send({
        discordId: "test456",
        username: "newuser",
        email: "new@example.com",
        password: "password123",
      });

      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
    });

    it("should login user", async () => {
      const response = await request(app).post("/api/users/login").send({
        email: "test@example.com",
        password: "password123",
      });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });
  });

  // Category tests
  describe("Category Endpoints", () => {
    it("should create a new category", async () => {
      const response = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Groceries",
          color: "#FF0000",
          emoji: "🛒",
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe("Groceries");
    });

    it("should get all categories", async () => {
      const response = await request(app)
        .get("/api/categories")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // Transaction tests
  describe("Transaction Endpoints", () => {
    it("should create a new transaction", async () => {
      const response = await request(app)
        .post("/api/transactions")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          category_id: testCategory.id,
          amount: 50.0,
          description: "Test transaction",
          merchant_name: "Test Store",
          transaction_date: new Date().toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.amount).toBe("50.00");
      testTransaction = response.body;
    });

    it("should get all transactions", async () => {
      const response = await request(app)
        .get("/api/transactions")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // Budget tests
  describe("Budget Endpoints", () => {
    it("should create a new budget", async () => {
      const response = await request(app)
        .post("/api/budgets")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          category_id: testCategory.id,
          amount: 1000.0,
          period_type: "monthly",
          start_date: new Date().toISOString(),
          end_date: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.amount).toBe("1000.00");
    });

    it("should get budget status", async () => {
      const response = await request(app)
        .get("/api/budgets/status")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
