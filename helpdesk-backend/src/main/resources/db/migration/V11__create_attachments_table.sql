CREATE TABLE attachments (
    id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID      REFERENCES tickets(id) ON DELETE CASCADE,
    reply_id    UUID      REFERENCES replies(id) ON DELETE CASCADE,
    uploaded_by UUID      NOT NULL REFERENCES users(id),
    file_name   VARCHAR(255) NOT NULL,
    file_url    TEXT         NOT NULL,
    file_size   BIGINT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);