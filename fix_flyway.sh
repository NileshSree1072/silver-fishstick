#!/bin/bash
# Remove the failed V12 migration record from Flyway history so it can rerun
sudo -u postgres psql -p 5432 -d helpdesk -c "DELETE FROM flyway_schema_history WHERE version = '12';"
echo "Flyway V12 cleared: $?"
