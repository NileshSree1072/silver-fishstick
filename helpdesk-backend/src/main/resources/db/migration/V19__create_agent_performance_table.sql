CREATE TABLE agent_performance_snapshots (
    id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id                   UUID NOT NULL REFERENCES users(id),
    period_start               TIMESTAMP NOT NULL,
    period_end                 TIMESTAMP NOT NULL,
    total_assigned             INTEGER NOT NULL DEFAULT 0,
    total_resolved             INTEGER NOT NULL DEFAULT 0,
    total_transferred_out      INTEGER NOT NULL DEFAULT 0,
    late_assigned_count        INTEGER NOT NULL DEFAULT 0,
    sla_eligible_count         INTEGER NOT NULL DEFAULT 0,
    sla_compliant_count        INTEGER NOT NULL DEFAULT 0,
    avg_first_response_minutes DOUBLE PRECISION,
    avg_handle_time_minutes    DOUBLE PRECISION,
    avg_satisfaction_score     DOUBLE PRECISION,
    computed_at                TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_perf_agent_id ON agent_performance_snapshots(agent_id);
CREATE INDEX idx_perf_period   ON agent_performance_snapshots(period_start, period_end);
