CREATE TABLE ticket_links (
    id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_a_id UUID      NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    ticket_b_id UUID      NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    linked_by   UUID      NOT NULL REFERENCES users(id),
    linked_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(ticket_a_id, ticket_b_id)   -- prevent duplicate links
);