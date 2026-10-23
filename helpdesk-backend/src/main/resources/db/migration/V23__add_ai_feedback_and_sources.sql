-- Tracks the customer's verdict on an AI answer and how confident retrieval was
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ai_feedback VARCHAR(16);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ai_confidence DOUBLE PRECISION;

-- JSON list of knowledge articles / tickets an AI reply was grounded on
ALTER TABLE replies ADD COLUMN IF NOT EXISTS ai_sources TEXT;

-- Backfill existing AI-resolved tickets
UPDATE tickets SET ai_feedback = 'PENDING'  WHERE ai_resolved = TRUE AND status = 'RESOLVED';
UPDATE tickets SET ai_feedback = 'ACCEPTED' WHERE ai_resolved = TRUE AND status = 'CLOSED';
