const OpenAI = require("openai");
const NodeCache = require("node-cache");
const { get_encoding, encoding_for_model } = require("tiktoken");
const logger = require("../utils/logger");

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Cache for 1 hour
    this.responseCache = new NodeCache({ stdTTL: 3600 });

    // Rate limiting cache
    this.rateLimitCache = new NodeCache({ stdTTL: 86400 }); // 24 hours

    this.encoding = encoding_for_model("gpt-3.5-turbo");

    this.systemPrompt = `You are a helpful personal finance assistant for a Discord bot. 
    You help users understand their spending, budgeting, and financial goals.
    
    IMPORTANT RULES:
    - Never provide specific investment advice
    - Always suggest consulting with financial professionals for major decisions
    - Focus on budgeting, expense tracking, and general financial literacy
    - Keep responses concise and Discord-friendly (under 2000 characters)
    - Use emojis appropriately to make responses engaging
    - If asked about sensitive financial data, remind users about privacy
    
    You have access to the user's transaction data and can provide insights based on their spending patterns.`;
  }

  async checkRateLimit(userId) {
    const key = `tokens_${userId}`;
    const current = this.rateLimitCache.get(key) || 0;
    const limit = parseInt(process.env.DAILY_TOKEN_LIMIT_PER_USER) || 10000;

    return current < limit;
  }

  async updateTokenUsage(userId, tokens) {
    const key = `tokens_${userId}`;
    const current = this.rateLimitCache.get(key) || 0;
    this.rateLimitCache.set(key, current + tokens);
  }

  countTokens(text) {
    try {
      return this.encoding.encode(text).length;
    } catch (error) {
      // Fallback estimation: ~4 characters per token
      return Math.ceil(text.length / 4);
    }
  }

  sanitizeFinancialData(text) {
    // Remove potential sensitive data patterns
    return text
      .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, "[CARD_REDACTED]")
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN_REDACTED]")
      .replace(/\b\d{9,12}\b/g, "[ACCOUNT_REDACTED]")
      .replace(/\$\d{4,}/g, "[LARGE_AMOUNT]"); // Redact large amounts for privacy
  }

  async generateResponse(userId, prompt, context = null) {
    try {
      // Check rate limits
      if (!(await this.checkRateLimit(userId))) {
        return {
          success: false,
          error: "Daily AI usage limit reached. Try again tomorrow!",
          type: "rate_limit",
        };
      }

      // Sanitize input
      const sanitizedPrompt = this.sanitizeFinancialData(prompt);

      // Check cache first
      const cacheKey = `response_${userId}_${Buffer.from(sanitizedPrompt).toString("base64").slice(0, 32)}`;
      const cached = this.responseCache.get(cacheKey);
      if (cached) {
        return { success: true, response: cached, cached: true };
      }

      // Prepare messages
      const messages = [{ role: "system", content: this.systemPrompt }];

      // Add context if provided
      if (context) {
        messages.push({
          role: "system",
          content: `User Context: ${JSON.stringify(context, null, 2)}`,
        });
      }

      messages.push({ role: "user", content: sanitizedPrompt });

      // Count tokens for cost tracking
      const totalTokens = messages.reduce(
        (sum, msg) => sum + this.countTokens(msg.content),
        0
      );

      // Make API call
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
        messages: messages,
        max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 150,
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.3,
      });

      const response = completion.choices[0].message.content;
      const responseTokens = this.countTokens(response);

      // Update rate limiting
      await this.updateTokenUsage(userId, totalTokens + responseTokens);

      // Cache the response
      this.responseCache.set(cacheKey, response);

      // Log usage for monitoring
      logger.info("AI Response Generated", {
        userId,
        inputTokens: totalTokens,
        outputTokens: responseTokens,
        model: process.env.OPENAI_MODEL,
        cached: false,
      });

      return {
        success: true,
        response: response,
        tokens: {
          input: totalTokens,
          output: responseTokens,
          total: totalTokens + responseTokens,
        },
      };
    } catch (error) {
      logger.error("AI Service Error:", {
        error: error.message,
        userId,
        prompt: prompt.substring(0, 100),
      });

      if (error.code === "rate_limit_exceeded") {
        return {
          success: false,
          error:
            "AI service is temporarily busy. Please try again in a moment.",
          type: "openai_rate_limit",
        };
      }

      return {
        success: false,
        error: "AI service temporarily unavailable.",
        type: "ai_error",
      };
    }
  }

  async generateTransactionInsights(userId, transactions) {
    if (!transactions || transactions.length === 0) {
      return {
        success: false,
        error: "No transactions available for analysis.",
      };
    }

    // Prepare transaction summary
    const summary = {
      totalTransactions: transactions.length,
      totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
      categories: {},
    };

    transactions.forEach((t) => {
      const category = t.category?.name || "Unknown";
      if (!summary.categories[category]) {
        summary.categories[category] = { count: 0, amount: 0 };
      }
      summary.categories[category].count++;
      summary.categories[category].amount += t.amount;
    });

    const prompt = `Based on this spending data, provide 2-3 brief insights and 1-2 actionable recommendations:

Transactions: ${summary.totalTransactions}
Total Spent: $${summary.totalAmount.toFixed(2)}
Categories: ${Object.entries(summary.categories)
      .map(
        ([cat, data]) =>
          `${cat}: $${data.amount.toFixed(2)} (${data.count} transactions)`
      )
      .join(", ")}

Keep the response under 300 words and focus on practical advice.`;

    return await this.generateResponse(userId, prompt);
  }

  async generateBudgetAdvice(userId, budgetStatus) {
    if (!budgetStatus || budgetStatus.length === 0) {
      return {
        success: false,
        error: "No budget data available for analysis.",
      };
    }

    const overBudget = budgetStatus.filter((b) => b.percentage > 100);
    const nearLimit = budgetStatus.filter(
      (b) => b.percentage > 80 && b.percentage <= 100
    );

    const prompt = `Provide budget advice based on this data:

${
  overBudget.length > 0
    ? `Over Budget: ${overBudget
        .map((b) => `${b.category} (${b.percentage.toFixed(1)}% used)`)
        .join(", ")}`
    : ""
}

${
  nearLimit.length > 0
    ? `Near Limit: ${nearLimit
        .map((b) => `${b.category} (${b.percentage.toFixed(1)}% used)`)
        .join(", ")}`
    : ""
}

Total Categories: ${budgetStatus.length}

Give 2-3 specific, actionable tips to improve their budget management.`;

    return await this.generateResponse(userId, prompt);
  }
}

module.exports = new AIService();
