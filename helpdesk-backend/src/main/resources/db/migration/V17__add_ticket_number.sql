CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START WITH 1 INCREMENT BY 1;

ALTER TABLE tickets
    ADD COLUMN ticket_number VARCHAR(32);

WITH numbered AS (
    SELECT id,
           'HD-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' ||
           LPAD(ROW_NUMBER() OVER (ORDER BY created_at, id)::TEXT, 6, '0') AS generated_number
    FROM tickets
)
UPDATE tickets t
SET ticket_number = numbered.generated_number
FROM numbered
WHERE t.id = numbered.id;

SELECT SETVAL('ticket_number_seq', GREATEST(ticket_count, 1), ticket_count > 0)
FROM (SELECT COUNT(*) AS ticket_count FROM tickets) counts;

ALTER TABLE tickets
    ALTER COLUMN ticket_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_tickets_ticket_number
    ON tickets(ticket_number);
