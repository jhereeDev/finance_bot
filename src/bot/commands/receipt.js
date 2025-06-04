const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { prisma } = require("../../config/database");
const userService = require("../../services/userService");
const ocrService = require("../../services/ocrService");
const receiptParser = require("../../services/receiptParser");

module.exports = {
  name: "receipt",
  description: "Process a receipt image",
  data: new SlashCommandBuilder()
    .setName("receipt")
    .setDescription("Process a receipt image")
    .addAttachmentOption((option) =>
      option
        .setName("image")
        .setDescription("The receipt image to process")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const attachment = interaction.options.getAttachment("image");

      if (!attachment.contentType?.startsWith("image/")) {
        return interaction.reply({
          content: "Please provide a valid image file.",
          ephemeral: true,
        });
      }

      // Ensure user exists
      let user;
      try {
        user = await userService.getOrCreateUser(
          interaction.user.id,
          interaction.user.username
        );
        if (!user) {
          await interaction.editReply(
            "User could not be found or created. Please try again later."
          );
          return;
        }
        console.log("User for receipt:", user);
      } catch (err) {
        console.error("Error ensuring user exists for receipt:", err);
        await interaction.editReply(
          "Failed to ensure user exists. Please try again later."
        );
        return;
      }

      // Show processing indicator
      await interaction.deferReply({ ephemeral: true });

      // Extract text from image
      const ocrResult = await ocrService.extractTextFromImage(attachment.url);

      if (!ocrResult.text) {
        return interaction.editReply(
          "Could not extract text from the image. Please try again with a clearer image."
        );
      }

      // Parse receipt data
      const receiptData = receiptParser.parseReceipt(
        ocrResult.text,
        ocrResult.lines
      );

      if (!receiptData.amount) {
        return interaction.editReply(
          "Could not detect the amount from the receipt. Please try again or add the transaction manually."
        );
      }

      // Check for duplicate receipt
      // The Transaction model does not have a receiptNumber field, so skip this check or implement it if you add such a field in the schema.
      // if (receiptData.receiptNumber) {
      //   const existingTransaction = await prisma.transaction.findFirst({
      //     where: {
      //       userId: interaction.user.id,
      //       receiptNumber: receiptData.receiptNumber,
      //     },
      //   });
      //   if (existingTransaction) {
      //     return interaction.editReply(
      //       `This receipt (No. ${receiptData.receiptNumber}) has already been processed. Amount: $${existingTransaction.amount}`
      //     );
      //   }
      // }

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
      }

      // Prepare transaction data
      const transactionData = {
        userId: user.id,
        categoryId: category.id,
        amount: receiptData.amount,
        description: receiptData.merchant,
        merchantName: receiptData.merchant,
        transactionDate: receiptData.date || new Date(),
        receiptImageUrl: attachment.url,
        ocrConfidence: ocrResult.confidence,
        isManual: false,
      };
      if (receiptData.receiptNumber) {
        transactionData.receiptNumber = receiptData.receiptNumber;
      }
      console.log("Transaction data to be created:", transactionData);

      // Create transaction
      const transaction = await prisma.transaction.create({
        data: transactionData,
        include: {
          category: true,
        },
      });

      // Get total for the transaction's month
      const transactionDate = transaction.transactionDate;
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

      const embed = new EmbedBuilder()
        .setColor("#00ff00")
        .setTitle("🧾 Receipt Processed Successfully!")
        .addFields(
          {
            name: "Amount",
            value: `$${transaction.amount.toFixed(2)}`,
            inline: true,
          },
          {
            name: "Merchant",
            value: transaction.merchantName || "Unknown",
            inline: true,
          },
          { name: "Category", value: transaction.category.name, inline: true },
          {
            name: "Date",
            value: transaction.transactionDate.toLocaleDateString(),
            inline: true,
          },
          {
            name: "Receipt No.",
            value: transaction.receiptNumber || "Not found",
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
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Receipt processing error:", error);
      await interaction.editReply(
        "Failed to process the receipt. Please try again."
      );
    }
  },
};
