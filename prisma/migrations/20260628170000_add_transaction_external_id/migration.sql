-- Add idempotency key for external payments.
ALTER TABLE "Transaction" ADD COLUMN "externalId" TEXT;

CREATE UNIQUE INDEX "Transaction_externalId_key" ON "Transaction"("externalId");
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");
CREATE INDEX "InventoryItem_isSold_idx" ON "InventoryItem"("isSold");
