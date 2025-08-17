/*
  Warnings:

  - You are about to drop the column `feeRate` on the `api_key_network_configs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."api_key_network_configs" DROP COLUMN "feeRate";
