const { prisma } = require("../../config/database");
const userService = require("../../services/userService");
const ocrService = require("../../services/ocrService");
const receiptParser = require("../../services/receiptParser");
const logger = require("../../utils/logger");

module.exports = {
  name: "messageCreate",
  async execute(message) {
    try {
      // Ignore messages from bots
      if (message.author.bot) return;

      // Check for receipt image
      const imageAttachment = message.attachments.find((att) =>
        att.contentType?.startsWith("image/")
      );

      if (imageAttachment) {
        logger.info("Processing receipt image in message handler:", {
          url: imageAttachment.url,
          contentType: imageAttachment.contentType,
          size: imageAttachment.size,
          author: message.author.username,
          guildId: message.guild?.id,
          channelId: message.channel.id,
        });

        // Ensure user exists
        let user;
        try {
          user = await userService.getOrCreateUser(
            message.author.id,
            message.author.username
          );
        } catch (error) {
          logger.error("Failed to get/create user:", {
            error: error.message,
            stack: error.stack,
            userId: message.author.id,
            username: message.author.username,
          });
          throw error;
        }

        // Show processing indicator
        await message.react("⏳");

        // Extract text from image
        try {
          const ocrResult = await ocrService.extractTextFromImage(
            imageAttachment.url
          );

          logger.info("OCR Result in message handler:", {
            text: ocrResult.text,
            confidence: ocrResult.confidence,
            lines: ocrResult.lines,
            url: imageAttachment.url,
          });

          if (!ocrResult.text) {
            await message.react("❌");
            return message.reply(
              "Could not extract text from the image. Please try again with a clearer image."
            );
          }

          // Parse receipt data
          const receiptData = receiptParser.parseReceipt(
            ocrResult.text,
            ocrResult.lines
          );

          logger.info("Parsed Receipt Data in message handler:", {
            amount: receiptData.amount,
            date: receiptData.date,
            merchant: receiptData.merchant,
            category: receiptData.category,
            receiptNumber: receiptData.receiptNumber,
            items: receiptData.items,
          });

          if (!receiptData.amount) {
            await message.react("❌");
            return message.reply(
              "Could not detect the amount from the receipt. Please try again or add the transaction manually."
            );
          }

          // Check for duplicate receipt
          if (receiptData.receiptNumber) {
            const existingTransaction = await prisma.transaction.findFirst({
              where: {
                userId: user.id,
                receiptNumber: receiptData.receiptNumber,
              },
            });

            if (existingTransaction) {
              logger.info("Duplicate receipt found in message handler:", {
                receiptNumber: receiptData.receiptNumber,
                existingAmount: existingTransaction.amount,
                userId: user.id,
              });
              await message.react("⚠️");
              return message.reply(
                `This receipt (No. ${receiptData.receiptNumber}) has already been processed. Amount: $${existingTransaction.amount}`
              );
            }
          }

          // Get or create category
          let category = await prisma.category.findFirst({
            where: {
              name: receiptData.category,
              userId: user.id,
            },
          });

          if (!category) {
            category = await prisma.category.create({
              data: {
                name: receiptData.category,
                userId: user.id,
                isDefault: false,
              },
            });
            logger.info("Created new category in message handler:", {
              categoryName: category.name,
              userId: user.id,
            });
          }

          // Create transaction
          const transaction = await prisma.transaction.create({
            data: {
              userId: user.id,
              categoryId: category.id,
              amount: receiptData.amount,
              description: receiptData.merchant,
              merchantName: receiptData.merchant,
              transactionDate: receiptData.date || new Date(),
              receiptImageUrl: imageAttachment.url,
              receiptNumber: receiptData.receiptNumber,
              ocrConfidence: ocrResult.confidence,
              isManual: false,
            },
            include: {
              category: true,
            },
          });

          logger.info("Created transaction in message handler:", {
            id: transaction.id,
            amount: transaction.amount,
            merchant: transaction.merchant_name,
            category: transaction.category.name,
            date: transaction.transaction_date,
            receiptNumber: transaction.receipt_number,
            userId: user.id,
          });

          // Get total for the transaction's month
          const transactionDate = transaction.transaction_date;
          const startOfMonth = new Date(
            transactionDate.getFullYear(),
            transactionDate.getMonth(),
            1
          );
          const endOfMonth = new Date(
            transactionDate.getFullYear(),
            transactionDate.getMonth() + 1,
            0,
            23,
            59,
            59,
            999
          );

          const monthlyTotal = await prisma.transaction.aggregate({
            where: {
              userId: user.id,
              transactionDate: {
                gte: startOfMonth,
                lte: endOfMonth,
              },
            },
            _sum: {
              amount: true,
            },
          });

          logger.info("Monthly total in message handler:", {
            startDate: startOfMonth,
            endDate: endOfMonth,
            total: monthlyTotal._sum.amount,
            userId: user.id,
          });

          // Show success indicator
          await message.react("✅");

          // Send confirmation message
          const embed = {
            color: 0x00ff00,
            title: "🧾 Receipt Processed Successfully!",
            fields: [
              {
                name: "Amount",
                value: `$${transaction.amount.toFixed(2)}`,
                inline: true,
              },
              {
                name: "Merchant",
                value: transaction.merchant_name || "Unknown",
                inline: true,
              },
              {
                name: "Category",
                value: transaction.category.name,
                inline: true,
              },
              {
                name: "Date",
                value: transaction.transaction_date.toLocaleDateString(),
                inline: true,
              },
              {
                name: "Receipt No.",
                value: transaction.receipt_number || "Not found",
                inline: true,
              },
              {
                name: "Confidence",
                value: `${(ocrResult.confidence * 100).toFixed(1)}%`,
                inline: true,
              },
              {
                name: "Month Total",
                value: `$${(monthlyTotal._sum.amount || 0).toFixed(2)}`,
                inline: true,
              },
            ],
            footer: {
              text: "Use /help to see available commands",
            },
          };

          await message.reply({ embeds: [embed] });
        } catch (error) {
          logger.error("Error processing receipt:", {
            error: error.message,
            stack: error.stack,
            url: imageAttachment.url,
            userId: message.author.id,
            guildId: message.guild?.id,
            channelId: message.channel.id,
          });
          await message.react("❌");
          await message.reply(
            "Failed to process the receipt. Please try again."
          );
        }
      }
    } catch (error) {
      logger.error("Error in message handler:", {
        error: error.message,
        stack: error.stack,
        userId: message.author?.id,
        guildId: message.guild?.id,
        channelId: message.channel?.id,
        content: message.content,
      });
    }
  },
};
