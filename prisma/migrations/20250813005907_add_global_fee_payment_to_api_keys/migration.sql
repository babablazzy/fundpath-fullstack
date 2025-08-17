-- AlterTable
ALTER TABLE "public"."api_keys" ADD COLUMN     "globalFeePayment" TEXT NOT NULL DEFAULT 'customer';
