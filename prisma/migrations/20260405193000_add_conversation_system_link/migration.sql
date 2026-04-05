ALTER TABLE "conversations"
ADD COLUMN "farmerSystemId" TEXT;

ALTER TABLE "conversations"
ADD CONSTRAINT "conversations_farmerSystemId_fkey"
FOREIGN KEY ("farmerSystemId") REFERENCES "farmer_systems"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "conversations_farmerSystemId_idx" ON "conversations"("farmerSystemId");
