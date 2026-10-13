#!/bin/bash
sudo -u postgres psql -p 5432 -c "ALTER USER postgres PASSWORD '1234';"
echo "Password set result: $?"
sudo -u postgres psql -p 5432 -c "\l" | grep helpdesk
