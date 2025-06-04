const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class Category {
  static async create(data) {
    return prisma.category.create({
      data: {
        name: data.name,
        emoji: data.emoji,
        color: data.color,
        userId: data.userId,
        isDefault: data.isDefault || false,
      },
    });
  }

  static async findAll(where) {
    return prisma.category.findMany({
      where,
    });
  }

  static async findOne(where) {
    return prisma.category.findFirst({
      where,
    });
  }

  static async update(where, data) {
    return prisma.category.update({
      where,
      data,
    });
  }

  static async delete(where) {
    return prisma.category.delete({
      where,
    });
  }

  static async findOrCreate(data) {
    const existing = await this.findOne({
      name: data.name,
      userId: data.userId,
    });

    if (existing) {
      return existing;
    }

    return this.create(data);
  }
}

module.exports = Category;
