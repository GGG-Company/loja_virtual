-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "ean" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "imageUrl" TEXT,
    "price" REAL NOT NULL,
    "compareAtPrice" REAL,
    "promotionalPrice" REAL,
    "cost" REAL,
    "ncm" TEXT,
    "origin" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stockLocation" TEXT,
    "minStock" INTEGER NOT NULL DEFAULT 5,
    "externalIdML" TEXT,
    "externalIdHiper" TEXT,
    "specs" JSONB,
    "weight" REAL,
    "dimensions" JSONB,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPromo" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_products" ("categoryId", "compareAtPrice", "cost", "createdAt", "description", "dimensions", "ean", "externalIdHiper", "externalIdML", "id", "imageUrl", "isActive", "isFeatured", "metaDescription", "metaTitle", "minStock", "name", "ncm", "origin", "price", "promotionalPrice", "shortDescription", "sku", "slug", "specs", "stock", "stockLocation", "updatedAt", "weight") SELECT "categoryId", "compareAtPrice", "cost", "createdAt", "description", "dimensions", "ean", "externalIdHiper", "externalIdML", "id", "imageUrl", "isActive", "isFeatured", "metaDescription", "metaTitle", "minStock", "name", "ncm", "origin", "price", "promotionalPrice", "shortDescription", "sku", "slug", "specs", "stock", "stockLocation", "updatedAt", "weight" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE UNIQUE INDEX "products_externalIdML_key" ON "products"("externalIdML");
CREATE UNIQUE INDEX "products_externalIdHiper_key" ON "products"("externalIdHiper");
CREATE INDEX "products_sku_idx" ON "products"("sku");
CREATE INDEX "products_slug_idx" ON "products"("slug");
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");
CREATE INDEX "products_isFeatured_idx" ON "products"("isFeatured");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
