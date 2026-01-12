-- CreateTable
CREATE TABLE "shipping_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "type" TEXT NOT NULL,
    "states" JSONB,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "price" REAL,
    "minValue" REAL,
    "name" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "shipping_rules_active_idx" ON "shipping_rules"("active");

-- CreateIndex
CREATE INDEX "shipping_rules_type_idx" ON "shipping_rules"("type");

-- CreateIndex
CREATE INDEX "shipping_rules_priority_idx" ON "shipping_rules"("priority");
