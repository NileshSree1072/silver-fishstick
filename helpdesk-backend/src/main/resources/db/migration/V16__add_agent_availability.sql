ALTER TABLE users
    ADD COLUMN availability_status VARCHAR(32) NOT NULL DEFAULT 'ONLINE',
    ADD COLUMN availability_updated_at TIMESTAMP,
    ADD COLUMN availability_reason VARCHAR(160),
    ADD COLUMN max_active_tickets INTEGER NOT NULL DEFAULT 10;

UPDATE users
SET availability_updated_at = CURRENT_TIMESTAMP
WHERE availability_updated_at IS NULL;
