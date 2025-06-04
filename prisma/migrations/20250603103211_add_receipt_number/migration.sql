/*
  Warnings:

  - A unique constraint covering the columns `[receipt_number]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,receipt_number]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "receipt_number" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "transactions_receipt_number_key" ON "transactions"("receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_user_id_receipt_number_key" ON "transactions"("user_id", "receipt_number");
