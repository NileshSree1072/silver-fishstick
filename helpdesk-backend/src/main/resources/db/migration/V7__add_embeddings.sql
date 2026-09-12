-- Enable pgvector extension (run once per database)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to tickets
-- 1536 dimensions = OpenAI text-embedding-3-small output size
ALTER TABLE tickets
  ADD COLUMN embedding vector(1536);

-- Add embedding column to knowledge_articles (for later)
CREATE TABLE knowledge_articles (
    id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    title        VARCHAR(255) NOT NULL,
    content      TEXT         NOT NULL,
    category_id  UUID         REFERENCES categories(id),
    author_id    UUID         REFERENCES users(id),
    embedding    vector(1536),
    is_published BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- IVFFlat index for fast similarity search on tickets
-- lists=100 is good for up to ~1M rows
CREATE INDEX idx_ticket_embedding
  ON tickets USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX idx_knowledge_embedding
  ON knowledge_articles USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);