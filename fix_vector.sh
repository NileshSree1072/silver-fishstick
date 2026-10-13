#!/bin/bash
# Check pgvector version in DB and upgrade if needed
sudo -u postgres psql -p 5432 -d helpdesk -c "SELECT extversion FROM pg_extension WHERE extname = 'vector';"
sudo -u postgres psql -p 5432 -d helpdesk -c "ALTER EXTENSION vector UPDATE;"
sudo -u postgres psql -p 5432 -d helpdesk -c "SELECT extversion FROM pg_extension WHERE extname = 'vector';"
# Clear failed V12 migration record again
sudo -u postgres psql -p 5432 -d helpdesk -c "DELETE FROM flyway_schema_history WHERE version = '12';"
echo "Done"
