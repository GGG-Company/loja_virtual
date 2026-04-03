-- ============================================================
-- Migration: Decimal monetário + Sequence pedidos + FTS + User
-- ============================================================

-- ── 1. User: tokenVersion + deletedAt ────────────────────────
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- ── 2. Float → Decimal(12,2) nos campos monetários ───────────

-- products
ALTER TABLE "products"
  ALTER COLUMN "price"            TYPE DECIMAL(12,2) USING "price"::DECIMAL(12,2),
  ALTER COLUMN "compareAtPrice"   TYPE DECIMAL(12,2) USING "compareAtPrice"::DECIMAL(12,2),
  ALTER COLUMN "promotionalPrice" TYPE DECIMAL(12,2) USING "promotionalPrice"::DECIMAL(12,2),
  ALTER COLUMN "cost"             TYPE DECIMAL(12,2) USING "cost"::DECIMAL(12,2);

-- product_variants
ALTER TABLE "product_variants"
  ALTER COLUMN "price" TYPE DECIMAL(12,2) USING "price"::DECIMAL(12,2);

-- orders
ALTER TABLE "orders"
  ALTER COLUMN "subtotal" TYPE DECIMAL(12,2) USING "subtotal"::DECIMAL(12,2),
  ALTER COLUMN "discount" TYPE DECIMAL(12,2) USING "discount"::DECIMAL(12,2),
  ALTER COLUMN "shipping" TYPE DECIMAL(12,2) USING "shipping"::DECIMAL(12,2),
  ALTER COLUMN "total"    TYPE DECIMAL(12,2) USING "total"::DECIMAL(12,2);

-- order_items
ALTER TABLE "order_items"
  ALTER COLUMN "price"    TYPE DECIMAL(12,2) USING "price"::DECIMAL(12,2),
  ALTER COLUMN "discount" TYPE DECIMAL(12,2) USING "discount"::DECIMAL(12,2),
  ALTER COLUMN "subtotal" TYPE DECIMAL(12,2) USING "subtotal"::DECIMAL(12,2);

-- coupons
ALTER TABLE "coupons"
  ALTER COLUMN "value"       TYPE DECIMAL(12,2) USING "value"::DECIMAL(12,2),
  ALTER COLUMN "minPurchase" TYPE DECIMAL(12,2) USING "minPurchase"::DECIMAL(12,2),
  ALTER COLUMN "maxDiscount" TYPE DECIMAL(12,2) USING "maxDiscount"::DECIMAL(12,2);

-- financial_config
ALTER TABLE "financial_config"
  ALTER COLUMN "creditCardInterestRate"  TYPE DECIMAL(6,4)  USING "creditCardInterestRate"::DECIMAL(6,4),
  ALTER COLUMN "debitCardInterestRate"   TYPE DECIMAL(6,4)  USING "debitCardInterestRate"::DECIMAL(6,4),
  ALTER COLUMN "minInstallmentValue"     TYPE DECIMAL(12,2) USING "minInstallmentValue"::DECIMAL(12,2),
  ALTER COLUMN "freeShippingMinValue"    TYPE DECIMAL(12,2) USING "freeShippingMinValue"::DECIMAL(12,2),
  ALTER COLUMN "defaultMarkupPercentage" TYPE DECIMAL(6,2)  USING "defaultMarkupPercentage"::DECIMAL(6,2);

-- shipping_rules
ALTER TABLE "shipping_rules"
  ALTER COLUMN "price"    TYPE DECIMAL(12,2) USING "price"::DECIMAL(12,2),
  ALTER COLUMN "minValue" TYPE DECIMAL(12,2) USING "minValue"::DECIMAL(12,2);

-- returns
ALTER TABLE "returns"
  ALTER COLUMN "refundAmount"   TYPE DECIMAL(12,2) USING "refundAmount"::DECIMAL(12,2),
  ALTER COLUMN "shippingRefund" TYPE DECIMAL(12,2) USING "shippingRefund"::DECIMAL(12,2);

-- ── 3. SEQUENCE para número de pedido (sem race condition) ────
CREATE SEQUENCE IF NOT EXISTS order_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Sincronizar a sequence com o maior pedido atual (para não colidir)
DO $$
DECLARE
  max_seq BIGINT;
BEGIN
  SELECT COALESCE(MAX(
    CAST(
      REGEXP_REPLACE(SPLIT_PART("orderNumber", '-', 3), '[^0-9]', '', 'g')
    AS BIGINT)
  ), 0) INTO max_seq
  FROM "orders"
  WHERE "orderNumber" ~ '^\w+-\d+-\d+$';

  IF max_seq > 0 THEN
    PERFORM setval('order_number_seq', max_seq);
  END IF;
END $$;

-- ── 4. Full-Text Search: coluna tsvector gerada + índice GIN ──
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "searchVector" tsvector
    GENERATED ALWAYS AS (
      to_tsvector('portuguese',
        coalesce("name", '') || ' ' ||
        coalesce("description", '') || ' ' ||
        coalesce("sku", '') || ' ' ||
        coalesce("ean", '')
      )
    ) STORED;

CREATE INDEX IF NOT EXISTS "products_search_vector_idx"
  ON "products" USING GIN ("searchVector");
