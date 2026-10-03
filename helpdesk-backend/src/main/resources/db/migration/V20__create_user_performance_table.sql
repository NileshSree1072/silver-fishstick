CREATE TABLE user_performance_snapshots (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id),
    period_start            TIMESTAMP NOT NULL,
    period_end              TIMESTAMP NOT NULL,
    total_tickets_submitted INTEGER NOT NULL DEFAULT 0,
    avg_response_minutes    DOUBLE PRECISION,
    repeat_issue_count      INTEGER NOT NULL DEFAULT 0,
    avg_satisfaction_given  DOUBLE PRECISION,
    auto_closed_count       INTEGER NOT NULL DEFAULT 0,
    computed_at             TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_perf_user_id ON user_performance_snapshots(user_id);
