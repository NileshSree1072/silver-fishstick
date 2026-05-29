CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_id   UUID REFERENCES tickets(id) ON DELETE CASCADE,

    type        VARCHAR(30) NOT NULL,
    message     TEXT NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT notifications_type_check
        CHECK (type IN (
            'NEW_TICKET',
            'AGENT_REPLIED',
            'USER_REPLIED',
            'TICKET_RESOLVED',
            'TICKET_ASSIGNED',
            'SLA_BREACH'
        ))
);

CREATE INDEX idx_notifications_user_id
    ON notifications(user_id);

CREATE INDEX idx_notifications_user_unread
    ON notifications(user_id, is_read)
    WHERE is_read = FALSE;