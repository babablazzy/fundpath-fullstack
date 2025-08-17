-- CreateTable
CREATE TABLE "public"."api_key_network_configs" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "payoutWallet" TEXT NOT NULL,
    "customerPaysFee" BOOLEAN NOT NULL DEFAULT true,
    "feeRate" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_key_network_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_key_network_configs_apiKeyId_network_token_key" ON "public"."api_key_network_configs"("apiKeyId", "network", "token");

-- AddForeignKey
ALTER TABLE "public"."api_key_network_configs" ADD CONSTRAINT "api_key_network_configs_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "public"."api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
