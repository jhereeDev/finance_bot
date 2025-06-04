require("dotenv").config();
const aiService = require("../services/aiService");
const logger = require("../utils/logger");

async function setupAI() {
  try {
    console.log("🤖 Setting up AI services...");

    // Test OpenAI connection
    const testResult = await aiService.generateResponse(
      "test_user",
      "Hello, this is a test."
    );

    if (testResult.success) {
      console.log("✅ OpenAI connection successful");
      console.log("📝 Test response:", testResult.response);
    } else {
      console.error("❌ OpenAI connection failed:", testResult.error);
      process.exit(1);
    }

    console.log("🎉 AI setup complete!");
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

setupAI();
