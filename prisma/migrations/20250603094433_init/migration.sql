/*
  Warnings:

  - You are about to drop the column `alert_threshold` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `is_rollover` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `budgets` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `icon` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `categories` table. All the data in the column will be lost.
  - You are about to drop the column `is_deleted` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `is_recurring` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `ocr_text` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `receipt_image_path` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `recurring_pattern` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `transactions` table. All the data in the column will be lost.
  - You are about to alter the column `ocr_confidence` on the `transactions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(3,2)`.
  - You are about to drop the column `is_active` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `preferences` on the `users` table. All the data in the column will be lost.
  - Made the column `user_id` on table `categories` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "budgets" DROP CONSTRAINT "budgets_user_id_fkey";

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_user_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_user_id_fkey";

-- DropIndex
DROP INDEX "budgets_user_id_category_id_period_type_key";

-- DropIndex
DROP INDEX "categories_name_user_id_key";

-- DropIndex
DROP INDEX "transactions_user_id_transaction_date_idx";

-- AlterTable
ALTER TABLE "budgets" DROP COLUMN "alert_threshold",
DROP COLUMN "currency",
DROP COLUMN "is_rollover",
DROP COLUMN "name",
DROP COLUMN "updated_at",
ALTER COLUMN "period_type" SET DEFAULT 'monthly';

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "description",
DROP COLUMN "icon",
DROP COLUMN "is_active",
DROP COLUMN "updated_at",
ALTER COLUMN "user_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "is_deleted",
DROP COLUMN "is_recurring",
DROP COLUMN "location",
DROP COLUMN "notes",
DROP COLUMN "ocr_text",
DROP COLUMN "receipt_image_path",
DROP COLUMN "recurring_pattern",
DROP COLUMN "tags",
ALTER COLUMN "ocr_confidence" SET DATA TYPE DECIMAL(3,2);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "is_active",
DROP COLUMN "preferences",
ADD COLUMN     "password" TEXT NOT NULL,
ALTER COLUMN "email" SET NOT NULL;

-- CreateIndex
CREATE INDEX "budgets_user_id_idx" ON "budgets"("user_id");

-- CreateIndex
CREATE INDEX "budgets_category_id_idx" ON "budgets"("category_id");

-- CreateIndex
CREATE INDEX "categories_user_id_idx" ON "categories"("user_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
