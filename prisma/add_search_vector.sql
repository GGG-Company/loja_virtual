-- Adiciona coluna de busca full-text
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- Popula com os dados existentes
UPDATE "products"
SET "searchVector" = to_tsvector('portuguese',
  coalesce(name, '') || ' ' ||
  coalesce(description, '') || ' ' ||
  coalesce(sku, '')
);

-- Índice GIN para busca em O(log n)
CREATE INDEX IF NOT EXISTS idx_products_search_vector
  ON "products" USING GIN("searchVector");

-- Trigger para manter atualizado automaticamente
CREATE OR REPLACE FUNCTION products_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" := to_tsvector('portuguese',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.sku, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_search_vector ON "products";
CREATE TRIGGER trg_products_search_vector
  BEFORE INSERT OR UPDATE ON "products"
  FOR EACH ROW EXECUTE FUNCTION products_search_vector_update();
