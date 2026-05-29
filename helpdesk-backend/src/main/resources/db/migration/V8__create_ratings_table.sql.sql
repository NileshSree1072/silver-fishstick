CREATE TABLE ratings (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID    NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
    user_id     UUID    NOT NULL      REFERENCES users(id),
    score       INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- One rating per ticket — enforced by UNIQUE on ticket_id
-- Index for fast agent performance queries
CREATE INDEX idx_ratings_user_id ON ratings(user_id);