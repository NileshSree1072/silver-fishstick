-- Agent thumbs-up / thumbs-down on AI output (summaries, drafts, insights)
CREATE TABLE ai_output_feedback (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID        NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id),
    kind        VARCHAR(16) NOT NULL,
    helpful     BOOLEAN     NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_output_feedback_kind ON ai_output_feedback(kind, helpful);
