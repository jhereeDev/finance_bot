/*
  Warnings:

  - The primary key for the `budgets` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `category_id` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `end_date` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `period_type` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `start_date` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `budgets` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `budgets` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - The primary key for the `categories` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `is_default` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `categories` table. All the data in the column will be lost.
  - The primary key for the `transactions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `category_id` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `is_manual` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `merchant_name` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `ocr_confidence` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `receipt_image_url` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `receipt_number` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `transaction_date` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `transactions` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `created_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `discord_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name,userId]` on the table `categories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[discordId]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `categoryId` to the `budgets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endDate` to the `budgets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `budgets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `budgets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `budgets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categoryId` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transactionDate` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `transactions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discordId` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "budgets" DROP CONSTRAINT "budgets_category_id_fkey";

-- DropForeignKey
ALTER TABLE "budgets" DROP CONSTRAINT "budgets_user_id_fkey";

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_user_id_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction_items" DROP CONSTRAINT "transaction_items_transaction_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_category_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_user_id_fkey";

-- DropIndex
DROP INDEX "budgets_category_id_idx";

-- DropIndex
DROP INDEX "budgets_user_id_idx";

-- DropIndex
DROP INDEX "categories_user_id_idx";

-- DropIndex
DROP INDEX "transactions_category_id_idx";

-- DropIndex
DROP INDEX "transactions_merchant_name_idx";

-- DropIndex
DROP INDEX "transactions_receipt_number_key";

-- DropIndex
DROP INDEX "transactions_user_id_idx";

-- DropIndex
DROP INDEX "transactions_user_id_receipt_number_key";

-- DropIndex
DROP INDEX "users_discord_id_key";

-- DropIndex
DROP INDEX "users_email_key";

-- AlterTable
ALTER TABLE "budgets" DROP CONSTRAINT "budgets_pkey",
DROP COLUMN "category_id",
DROP COLUMN "created_at",
DROP COLUMN "end_date",
DROP COLUMN "is_active",
DROP COLUMN "period_type",
DROP COLUMN "start_date",
DROP COLUMN "user_id",
ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "periodType" TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "amount" SET DATA TYPE DOUBLE PRECISION,
ADD CONSTRAINT "budgets_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "budgets_id_seq";

-- AlterTable
ALTER TABLE "categories" DROP CONSTRAINT "categories_pkey",
DROP COLUMN "created_at",
DROP COLUMN "is_default",
DROP COLUMN "user_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "categories_id_seq";

-- AlterTable
ALTER TABLE "transaction_items" ALTER COLUMN "transaction_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_pkey",
DROP COLUMN "category_id",
DROP COLUMN "created_at",
DROP COLUMN "is_manual",
DROP COLUMN "merchant_name",
DROP COLUMN "ocr_confidence",
DROP COLUMN "receipt_image_url",
DROP COLUMN "receipt_number",
DROP COLUMN "transaction_date",
DROP COLUMN "updated_at",
DROP COLUMN "user_id",
ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isManual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "merchantName" TEXT,
ADD COLUMN     "ocrConfidence" DOUBLE PRECISION,
ADD COLUMN     "receiptImageUrl" TEXT,
ADD COLUMN     "receiptNumber" TEXT,
ADD COLUMN     "transactionDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "amount" SET DATA TYPE DOUBLE PRECISION,
ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "transactions_id_seq";

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "created_at",
DROP COLUMN "discord_id",
DROP COLUMN "email",
DROP COLUMN "password",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "discordId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "users_id_seq";

-- CreateIndex
CREATE INDEX "budgets_userId_idx" ON "budgets"("userId");

-- CreateIndex
CREATE INDEX "budgets_categoryId_idx" ON "budgets"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_userId_key" ON "categories"("name", "userId");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");

-- CreateIndex
CREATE INDEX "transactions_categoryId_idx" ON "transactions"("categoryId");

-- CreateIndex
CREATE INDEX "transactions_merchantName_idx" ON "transactions"("merchantName");

-- CreateIndex
CREATE UNIQUE INDEX "users_discordId_key" ON "users"("discordId");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("discordId") ON DELETE CASCADE ON UPDATE CASCADE;
