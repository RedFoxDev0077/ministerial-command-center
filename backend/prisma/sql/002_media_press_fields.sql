-- ---------------------------------------------------------------------------
-- Press office fields on media_transcriptions.
--
-- Applied as SQL rather than `prisma db push` because this database carries a
-- GENERATED column (documents.search_vector) that Prisma cannot represent:
-- db push offers to DROP it, and --accept-data-loss would silently destroy
-- full-text search. See prisma/sql/001_document_search_vector.sql.
--
-- Safe to re-run.
-- ---------------------------------------------------------------------------

ALTER TABLE media_transcriptions
  ADD COLUMN IF NOT EXISTS "pressRelease" TEXT;

ALTER TABLE media_transcriptions
  ADD COLUMN IF NOT EXISTS "headlines" TEXT[] NOT NULL DEFAULT '{}';
