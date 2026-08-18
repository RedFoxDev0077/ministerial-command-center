-- ---------------------------------------------------------------------------
-- Full-text search support for `documents`.
--
-- DocumentsService.search() queries `documents.search_vector`, but Prisma has
-- no tsvector type, so the column cannot live in schema.prisma and is NOT
-- created by `prisma db push` / `prisma migrate`. Without this script the FTS
-- query fails and the service falls back to a slower substring search.
--
-- Apply once per environment, after the Prisma schema has been pushed:
--   psql "$DATABASE_URL" -f prisma/sql/001_document_search_vector.sql
--
-- Safe to re-run.
-- ---------------------------------------------------------------------------

-- Generated column: PostgreSQL keeps it in sync on every INSERT/UPDATE, so
-- there is no trigger to maintain and no way for it to drift from the row.
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce("correlativeNumber", '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(type, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(content, '')), 'C')
  ) STORED;

-- GIN index: without it every search is a sequential scan over the table.
CREATE INDEX IF NOT EXISTS documents_search_vector_idx
  ON documents USING GIN (search_vector);
