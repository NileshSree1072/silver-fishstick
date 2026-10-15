-- Migration: Create System AI Bot User if not present
INSERT INTO users (id, name, email, password, role, is_active, availability_status, max_active_tickets)
VALUES ('a3454d31-5a64-4bb0-91ea-27cfbe64521d', 'Aegis AI Assistant', 'ai-bot@helpdesk.com', 'NO_LOGIN_SYSTEM_AI', 'AGENT', true, 'ONLINE', 100)
ON CONFLICT (id) DO UPDATE 
SET name = 'Aegis AI Assistant', 
    email = 'ai-bot@helpdesk.com', 
    role = 'AGENT';
