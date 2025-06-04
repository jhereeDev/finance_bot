const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class TransactionService {
  async createTransaction(transactionData) {
    try {
      const transaction = await prisma.transaction.create({
        data: {
          userId: transactionData.userId,
          categoryId: transactionData.categoryId,
          amount: transactionData.amount,
          currency: transactionData.currency || "USD",
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
          location: transactionData.location,
        },
        include: {
          category: true,
          user: true,
        },
      });

      // Create transaction items if provided
      if (transactionData.items && transactionData.items.length > 0) {
        await this.createTransactionItems(
          transaction.id,
          transactionData.items
        );
      }

      return transaction;
    } catch (error) {
      console.error("Error creating transaction:", error);
      throw error;
    }
  }

  async createTransactionItems(transactionId, items) {
    const itemsData = items.map((item) => ({
      transactionId,
      name: item.name,
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || item.price,
      totalPrice: item.totalPrice || item.price * (item.quantity || 1),
      category: item.category,
      sku: item.sku,
    }));

    return await prisma.transactionItem.createMany({
      data: itemsData,
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
      sortBy = "transactionDate",
      sortOrder = "desc",
    } = options;

    const where = {
      userId,
      isDeleted: false,
      ...(categoryId && { categoryId }),
      ...(startDate &&
        endDate && {
          transactionDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
      ...(searchTerm && {
        OR: [
          { description: { contains: searchTerm, mode: "insensitive" } },
          { merchantName: { contains: searchTerm, mode: "insensitive" } },
          { notes: { contains: searchTerm, mode: "insensitive" } },
        ],
      }),
    };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: true,
          items: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getTransactionById(transactionId, userId) {
    return await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
        isDeleted: false,
      },
      include: {
        category: true,
        items: true,
      },
    });
  }

  async updateTransaction(transactionId, userId, updateData) {
    return await prisma.transaction.update({
      where: {
        id: transactionId,
        userId,
      },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: {
        category: true,
        items: true,
      },
    });
  }

  async deleteTransaction(transactionId, userId) {
    return await prisma.transaction.update({
      where: {
        id: transactionId,
        userId,
      },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    });
  }

  async getSpendingByCategory(userId, startDate, endDate) {
    return await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        isDeleted: false,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
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

    return result.map((row) => ({
      month: parseInt(row.month),
      total: parseFloat(row.total),
      count: parseInt(row.count),
    }));
  }

  async getTopMerchants(userId, limit = 10, startDate, endDate) {
    return await prisma.transaction.groupBy({
      by: ["merchantName"],
      where: {
        userId,
        isDeleted: false,
        merchantName: { not: null },
        ...(startDate &&
          endDate && {
            transactionDate: {
              gte: startDate,
              lte: endDate,
            },
          }),
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          amount: "desc",
        },
      },
      take: limit,
    });
  }

  async getRecentTransactions(userId, limit = 5) {
    return await prisma.transaction.findMany({
      where: {
        userId,
        isDeleted: false,
      },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  }
}

module.exports = new TransactionService();
