-- Executar após prisma db push:
--   npx prisma db execute --schema=prisma/schema.prisma --file=prisma/setup-raw.sql

CREATE SEQUENCE IF NOT EXISTS order_number_seq
  START WITH 1 INCREMENT BY 1 CACHE 1;

DO $$
DECLARE max_seq BIGINT;
BEGIN
  SELECT COALESCE(MAX(
    CAST(REGEXP_REPLACE(SPLIT_PART("orderNumber", '-', 3), '[^0-9]', '', 'g') AS BIGINT)
  ), 0) INTO max_seq
  FROM "orders"
  WHERE "orderNumber" ~ '^\w+-\d+-\d+$';
  IF max_seq > 0 THEN
    PERFORM setval('order_number_seq', max_seq);
  END IF;
END $$;

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "searchVector" tsvector
    GENERATED ALWAYS AS (
      to_tsvector('portuguese',
        coalesce(name, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(sku, '') || ' ' ||
        coalesce(ean, '')
      )
    ) STORED;

CREATE INDEX IF NOT EXISTS products_search_vector_idx
  ON "products" USING GIN ("searchVector");
