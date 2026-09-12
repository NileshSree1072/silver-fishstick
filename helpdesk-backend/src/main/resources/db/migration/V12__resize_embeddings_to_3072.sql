-- Resize embedding columns from 1536 (text-embedding-3-small)
-- to 3072 (text-embedding-3-large) dimensions.
--
-- NOTE: pgvector's HNSW and IVFFlat indexes both cap at 2000 dimensions.
-- For 3072-dim vectors we skip index creation and use exact (sequential)
-- cosine similarity search instead. Performance is acceptable for moderate
-- ticket volumes and can be revisited if pgvector raises its index limit.

-- Drop old dimension-specific indexes
DROP INDEX IF EXISTS idx_ticket_embedding;
DROP INDEX IF EXISTS idx_knowledge_embedding;

-- Resize tickets embedding column (NULL out stale 1536-dim vectors)
ALTER TABLE tickets
  ALTER COLUMN embedding TYPE vector(3072)
  USING NULL;

-- Resize knowledge_articles embedding column
ALTER TABLE knowledge_articles
  ALTER COLUMN embedding TYPE vector(3072)
  USING NULL;

-- NOTE: No index created — exact cosine search will be used automatically.
-- pgvector supports this natively; no code change needed.
