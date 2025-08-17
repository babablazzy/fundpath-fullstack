-- CreateTable
CREATE TABLE "public"."platform_fees" (
    "id" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "baseFeeRate" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "gasFeeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "minFeeRate" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "maxFeeRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_fees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_fees_network_token_key" ON "public"."platform_fees"("network", "token");
