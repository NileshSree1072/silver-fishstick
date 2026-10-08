
CREATE TABLE ticket_timeline (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id     UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    event_type    VARCHAR(50) NOT NULL,
    actor_id      UUID REFERENCES users(id),
    actor_role    VARCHAR(20),
    note          TEXT,
    occurred_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_timeline_ticket_id   ON ticket_timeline(ticket_id);
CREATE INDEX idx_timeline_occurred_at ON ticket_timeline(occurred_at);
CREATE INDEX idx_timeline_actor_id    ON ticket_timeline(actor_id);
CREATE INDEX idx_timeline_event_type  ON ticket_timeline(event_type);
