CREATE TABLE sla_rules (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    priority         VARCHAR(20) NOT NULL UNIQUE,
    response_hours   INT NOT NULL,
    resolution_hours INT NOT NULL,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT sla_rules_priority_check
        CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'))
);

CREATE TRIGGER sla_rules_updated_at
BEFORE UPDATE ON sla_rules
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO sla_rules (priority, response_hours, resolution_hours) VALUES
('URGENT', 1, 4),
('HIGH', 2, 12),
('MEDIUM', 4, 24),
('LOW', 8, 72);
