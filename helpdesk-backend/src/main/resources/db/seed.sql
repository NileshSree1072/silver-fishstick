-- =============================================================================
-- Helpdesk Seed Data (idempotent - safe to re-run)
-- Run AFTER Flyway migrations + DataInitializer have executed.
-- All user passwords = bcrypt('12345678')
-- $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- =============================================================================

-- =============================================================================
-- 1. CATEGORIES (5 new + leave existing 'General' untouched)
-- =============================================================================
INSERT INTO categories (id, name, description, created_at) VALUES
  ('10000000-0000-0000-0000-000000000001', 'IT Support',  'Hardware, software, network and access issues',             NOW() - INTERVAL '90 days'),
  ('10000000-0000-0000-0000-000000000002', 'HR',          'Payroll, leave, onboarding and HR policy queries',          NOW() - INTERVAL '90 days'),
  ('10000000-0000-0000-0000-000000000003', 'Finance',     'Expense claims, invoices and budget-related requests',      NOW() - INTERVAL '90 days'),
  ('10000000-0000-0000-0000-000000000004', 'Facilities',  'Building access, maintenance and workspace requests',       NOW() - INTERVAL '90 days'),
  ('10000000-0000-0000-0000-000000000005', 'Security',    'Account lockouts, phishing reports and security incidents', NOW() - INTERVAL '90 days')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- 2. USERS  (password hash = bcrypt('12345678'))
-- DataInitializer already created admin@helpdesk.com and agent@helpdesk.com
-- =============================================================================

-- Admin seed user
INSERT INTO users (id, name, email, password, role, is_active, category_id, availability_status, max_active_tickets, created_at) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Admin User', 'admin@helpdesk.com',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'ADMIN', true, NULL, 'ONLINE', 999, NOW() - INTERVAL '90 days')
ON CONFLICT (email) DO NOTHING;

-- Agents
INSERT INTO users (id, name, email, password, role, is_active, category_id, availability_status, max_active_tickets, created_at) VALUES
  ('20000000-0000-0000-0000-000000000002', 'Alice Chen',   'alice.chen@helpdesk.com',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'AGENT', true, '10000000-0000-0000-0000-000000000001', 'ONLINE', 15, NOW() - INTERVAL '85 days'),
  ('20000000-0000-0000-0000-000000000003', 'Bob Martinez', 'bob.martinez@helpdesk.com',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'AGENT', true, '10000000-0000-0000-0000-000000000002', 'ONLINE', 15, NOW() - INTERVAL '80 days'),
  ('20000000-0000-0000-0000-000000000004', 'Carol Singh',  'carol.singh@helpdesk.com',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'AGENT', true, '10000000-0000-0000-0000-000000000003', 'ONLINE', 15, NOW() - INTERVAL '75 days'),
  ('20000000-0000-0000-0000-000000000005', 'David Kim',    'david.kim@helpdesk.com',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'AGENT', true, '10000000-0000-0000-0000-000000000004', 'BUSY',   10, NOW() - INTERVAL '70 days'),
  ('20000000-0000-0000-0000-000000000006', 'Eva Patel',    'eva.patel@helpdesk.com',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'AGENT', true, '10000000-0000-0000-0000-000000000005', 'ONLINE', 15, NOW() - INTERVAL '65 days')
ON CONFLICT (email) DO NOTHING;

-- End Users
INSERT INTO users (id, name, email, password, role, is_active, category_id, availability_status, max_active_tickets, created_at) VALUES
  ('20000000-0000-0000-0000-000000000007', 'Frank Nguyen',  'frank.nguyen@company.com',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'USER', true, NULL, 'ONLINE', 10, NOW() - INTERVAL '60 days'),
  ('20000000-0000-0000-0000-000000000008', 'Grace Lee',     'grace.lee@company.com',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'USER', true, NULL, 'ONLINE', 10, NOW() - INTERVAL '55 days'),
  ('20000000-0000-0000-0000-000000000009', 'Hank Wilson',   'hank.wilson@company.com',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'USER', true, NULL, 'ONLINE', 10, NOW() - INTERVAL '50 days'),
  ('20000000-0000-0000-0000-000000000010', 'Iris Thompson', 'iris.thompson@company.com',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'USER', true, NULL, 'ONLINE', 10, NOW() - INTERVAL '45 days'),
  ('20000000-0000-0000-0000-000000000011', 'James Brown',   'james.brown@company.com',
   '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'USER', false, NULL, 'ONLINE', 10, NOW() - INTERVAL '40 days')
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- 3. TICKETS (20 tickets – General category uses subquery to find actual UUID)
-- =============================================================================
INSERT INTO tickets (id, ticket_number, title, description, status, priority, category_id, created_by, assigned_to, ai_resolved, created_at, updated_at, resolved_at) VALUES

  -- IT Support
  ('30000000-0000-0000-0000-000000000001', 'HD-20261001-000001',
   'Cannot connect to VPN',
   'I am unable to connect to the corporate VPN since this morning. Error code 800. Tried restarting VPN client and machine.',
   'RESOLVED', 'HIGH', '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002',
   false, NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days', NOW() - INTERVAL '29 days'),

  ('30000000-0000-0000-0000-000000000002', 'HD-20261005-000002',
   'Laptop screen flickering',
   'My Dell XPS 15 screen starts flickering randomly when running Chrome. Happens 5-6 times per hour.',
   'CLOSED', 'MEDIUM', '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000002',
   false, NOW() - INTERVAL '25 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '21 days'),

  ('30000000-0000-0000-0000-000000000003', 'HD-20261010-000003',
   'Need admin rights to install dev tools',
   'I need local admin rights on my workstation to install Node.js 20 and Docker Desktop. Manager approval obtained.',
   'IN_PROGRESS', 'MEDIUM', '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000002',
   false, NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', NULL),

  ('30000000-0000-0000-0000-000000000004', 'HD-20261015-000004',
   'Email not syncing on mobile',
   'Work email not syncing on iPhone 15. Emails arrive on Outlook desktop but not on the mobile app.',
   'OPEN', 'LOW', '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000010', NULL,
   false, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NULL),

  ('30000000-0000-0000-0000-000000000005', 'HD-20261020-000005',
   'Critical server down – production impacted',
   'Production server app-prod-01 is down. All customer-facing services unavailable for 15+ minutes. Escalate immediately.',
   'RESOLVED', 'URGENT', '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002',
   false, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '2 hours'),

  -- HR
  ('30000000-0000-0000-0000-000000000006', 'HD-20261003-000006',
   'Payslip not received for September',
   'I have not received my payslip for September 2026. Bank account shows no salary credit either.',
   'RESOLVED', 'HIGH', '10000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000003',
   false, NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'),

  ('30000000-0000-0000-0000-000000000007', 'HD-20261008-000007',
   'Leave balance discrepancy',
   'Leave balance shows 5 days remaining but I have only taken 3 days this year. HR portal deducted 2 extra days.',
   'IN_PROGRESS', 'MEDIUM', '10000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000003',
   false, NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days', NULL),

  ('30000000-0000-0000-0000-000000000008', 'HD-20261012-000008',
   'Update emergency contact details',
   'Need to update emergency contact from my mother to my spouse. Please advise the process.',
   'CLOSED', 'LOW', '10000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000003',
   true, NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days'),

  -- Finance
  ('30000000-0000-0000-0000-000000000009', 'HD-20261006-000009',
   'Expense claim reimbursement delayed',
   'Expense claim of $450 for client visit (Claim ID: EXP-2026-1042) pending for 3 weeks. Please expedite.',
   'RESOLVED', 'MEDIUM', '10000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000004',
   false, NOW() - INTERVAL '17 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),

  ('30000000-0000-0000-0000-000000000010', 'HD-20261014-000010',
   'Invoice approval for vendor payment',
   'Vendor GreenTech Solutions submitted invoice INV-2026-0089 for $12,000 (Q3 cloud hosting). Please approve.',
   'IN_PROGRESS', 'HIGH', '10000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000004',
   false, NOW() - INTERVAL '9 days', NOW() - INTERVAL '8 days', NULL),

  -- Facilities
  ('30000000-0000-0000-0000-000000000011', 'HD-20261002-000011',
   'Air conditioning not working in 3rd floor',
   'AC unit on 3rd floor east wing non-functional since Monday. Temperature approx 32C. Affects 25 staff.',
   'RESOLVED', 'HIGH', '10000000-0000-0000-0000-000000000004',
   '20000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000005',
   false, NOW() - INTERVAL '21 days', NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days'),

  ('30000000-0000-0000-0000-000000000012', 'HD-20261009-000012',
   'Request for additional monitor',
   'Requesting a second 27-inch monitor for Desk 4B-12 to improve data analysis productivity.',
   'CLOSED', 'LOW', '10000000-0000-0000-0000-000000000004',
   '20000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000005',
   false, NOW() - INTERVAL '14 days', NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days'),

  ('30000000-0000-0000-0000-000000000013', 'HD-20261016-000013',
   'Printer on 2nd floor jammed',
   'Canon MF742C printer on 2nd floor showing paper jam error. Multiple staff unable to print.',
   'OPEN', 'MEDIUM', '10000000-0000-0000-0000-000000000004',
   '20000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000005',
   false, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', NULL),

  -- Security
  ('30000000-0000-0000-0000-000000000014', 'HD-20261004-000014',
   'Phishing email received – urgent',
   'Received suspicious email from fake IT department asking for credentials. I did NOT click the link.',
   'RESOLVED', 'URGENT', '10000000-0000-0000-0000-000000000005',
   '20000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000006',
   false, NOW() - INTERVAL '26 days', NOW() - INTERVAL '26 days', NOW() - INTERVAL '26 days' + INTERVAL '3 hours'),

  ('30000000-0000-0000-0000-000000000015', 'HD-20261011-000015',
   'Account locked out after password reset',
   'After resetting my password via self-service portal, my account is locked. Cannot log into any systems.',
   'RESOLVED', 'HIGH', '10000000-0000-0000-0000-000000000005',
   '20000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000006',
   false, NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days' + INTERVAL '1 hour'),

  ('30000000-0000-0000-0000-000000000016', 'HD-20261017-000016',
   'Request access to shared drive',
   'Need read/write access to Projects/Q4-2026 shared drive for product launch. PM: Sarah Collins.',
   'IN_PROGRESS', 'MEDIUM', '10000000-0000-0000-0000-000000000005',
   '20000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000006',
   false, NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days', NULL),

  -- General (uses existing 'General' category – looked up dynamically)
  ('30000000-0000-0000-0000-000000000017', 'HD-20261018-000017',
   'Office WiFi slow during peak hours',
   'Office WiFi is extremely slow between 10 AM-12 PM and 2 PM. Video calls keep dropping for two weeks.',
   'OPEN', 'MEDIUM', (SELECT id FROM categories WHERE name = 'General' LIMIT 1),
   '20000000-0000-0000-0000-000000000007', NULL,
   false, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', NULL),

  ('30000000-0000-0000-0000-000000000018', 'HD-20261019-000018',
   'Need training on new CRM tool',
   'Team migrated to Salesforce CRM but no training received. Please arrange session for 12 sales staff.',
   'IN_PROGRESS', 'LOW', (SELECT id FROM categories WHERE name = 'General' LIMIT 1),
   '20000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000003',
   false, NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days', NULL),

  ('30000000-0000-0000-0000-000000000019', 'HD-20261021-000019',
   'Request for ergonomic chair',
   'Experiencing back pain due to current chair. Doctor recommends ergonomic chair. Can provide medical note.',
   'OPEN', 'LOW', (SELECT id FROM categories WHERE name = 'General' LIMIT 1),
   '20000000-0000-0000-0000-000000000009', NULL,
   false, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NULL),

  ('30000000-0000-0000-0000-000000000020', 'HD-20261022-000020',
   'Software license renewal required',
   'Adobe Creative Cloud license (8 seats) for design team expires Nov 1st. Please renew to avoid interruption.',
   'OPEN', 'HIGH', (SELECT id FROM categories WHERE name = 'General' LIMIT 1),
   '20000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000002',
   false, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NULL)

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 4. REPLIES
-- =============================================================================
INSERT INTO replies (id, ticket_id, sender_id, message, is_internal, is_ai_generated, created_at) VALUES
  -- Ticket 1 – VPN
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
   'Hi Frank, I can see your VPN profile. The certificate expired. I am renewing it and will send you new credentials shortly.',
   false, false, NOW() - INTERVAL '30 days' + INTERVAL '1 hour'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000007',
   'Thank you Alice! The new credentials worked perfectly. VPN is now connected.',
   false, false, NOW() - INTERVAL '30 days' + INTERVAL '3 hours'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
   'Internal note: Certificate auto-renewal was disabled. Re-enabling it now to prevent recurrence.',
   true, false, NOW() - INTERVAL '29 days'),

  -- Ticket 2 – Laptop screen
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
   'Grace, please try updating your display driver. Go to Device Manager, Display Adapters, right-click, Update driver.',
   false, false, NOW() - INTERVAL '25 days' + INTERVAL '2 hours'),
  ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000008',
   'Updated the driver as suggested but flickering continues. Could this be a hardware issue?',
   false, false, NOW() - INTERVAL '24 days'),
  ('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
   'Arranging a hardware check. Technician visiting tomorrow at 10 AM. Screen cable was found loose and fixed.',
   false, false, NOW() - INTERVAL '22 days'),

  -- Ticket 5 – Production server
  ('40000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002',
   'On it. Investigating app-prod-01. Initial check shows disk usage at 99%. Clearing old logs now.',
   false, false, NOW() - INTERVAL '3 days' + INTERVAL '20 minutes'),
  ('40000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002',
   'Server restored. Root cause: log file rotation was disabled 3 weeks ago after a config change. Services back online.',
   false, false, NOW() - INTERVAL '3 days' + INTERVAL '2 hours'),
  ('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000007',
   'Confirmed, services are back. Thank you for the rapid response!',
   false, false, NOW() - INTERVAL '3 days' + INTERVAL '2 hours' + INTERVAL '15 minutes'),

  -- Ticket 6 – Payslip
  ('40000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000003',
   'Grace, salary was processed but the payslip email bounced due to wrong email on file. Correcting and resending.',
   false, false, NOW() - INTERVAL '20 days' + INTERVAL '3 hours'),
  ('40000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000008',
   'Received the payslip. Salary also credited. Thank you Bob!',
   false, false, NOW() - INTERVAL '18 days'),

  -- Ticket 14 – Phishing
  ('40000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000006',
   'Grace, thank you for reporting this promptly. This is a credential harvesting attack. We are blocking the sender. Please delete the email.',
   false, false, NOW() - INTERVAL '26 days' + INTERVAL '30 minutes'),
  ('40000000-0000-0000-0000-000000000013', '30000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000006',
   'INTERNAL: Phishing campaign blocked at firewall. Security awareness reminder sent to all staff.',
   true, false, NOW() - INTERVAL '26 days' + INTERVAL '2 hours'),

  -- Ticket 15 – Account locked
  ('40000000-0000-0000-0000-000000000014', '30000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000006',
   'Hank, there is a token cache issue post-reset. Unlocking your account and clearing cached credentials now.',
   false, false, NOW() - INTERVAL '13 days' + INTERVAL '25 minutes'),
  ('40000000-0000-0000-0000-000000000015', '30000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000009',
   'Fixed! I can log in now. Thank you Eva!',
   false, false, NOW() - INTERVAL '13 days' + INTERVAL '1 hour'),

  -- Ticket 18 – CRM Training
  ('40000000-0000-0000-0000-000000000016', '30000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000003',
   'Grace, arranging a 2-hour Salesforce training session. Proposed date: November 5th at 2 PM. Does that work?',
   false, false, NOW() - INTERVAL '7 days' + INTERVAL '4 hours'),
  ('40000000-0000-0000-0000-000000000017', '30000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000008',
   'November 5th works perfectly for our team. Thank you for arranging this so quickly!',
   false, false, NOW() - INTERVAL '6 days')

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 5. RATINGS (resolved / closed tickets only)
-- =============================================================================
INSERT INTO ratings (id, ticket_id, user_id, score, comment, created_at) VALUES
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000007', 5, 'Alice resolved this super quickly. Very professional!',                               NOW() - INTERVAL '28 days'),
  ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000008', 4, 'Took a day but the hardware fix worked great.',                                        NOW() - INTERVAL '20 days'),
  ('50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000007', 5, 'Incredible response time for a P1 issue. Server back in under 2 hours.',               NOW() - INTERVAL '3 days' + INTERVAL '3 hours'),
  ('50000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000008', 5, 'Bob resolved it quickly and found the root cause.',                                    NOW() - INTERVAL '17 days'),
  ('50000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000010', 4, 'Easy and quick, almost self-service.',                                                 NOW() - INTERVAL '11 days'),
  ('50000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000007', 3, 'Took longer than expected but was eventually resolved.',                               NOW() - INTERVAL '14 days'),
  ('50000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000009', 5, 'AC fixed same day. David was very proactive.',                                         NOW() - INTERVAL '18 days'),
  ('50000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000010', 4, 'Monitor delivered within 2 days. Happy with the support.',                            NOW() - INTERVAL '12 days'),
  ('50000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000008', 5, 'Eva handled the security threat very professionally and kept me informed throughout.', NOW() - INTERVAL '25 days'),
  ('50000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000009', 5, 'Fixed in under an hour! Amazing support.',                                            NOW() - INTERVAL '12 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 6. KNOWLEDGE ARTICLES
-- =============================================================================
INSERT INTO knowledge_articles (id, title, content, category_id, author_id, is_published, created_at) VALUES
  ('60000000-0000-0000-0000-000000000001',
   'How to Connect to Corporate VPN',
   'Connecting to the Corporate VPN. Prerequisites: Cisco AnyConnect client installed and valid VPN credentials. Steps: 1. Open Cisco AnyConnect. 2. Enter server address vpn.company.com. 3. Enter corporate username and password. 4. Wait for connection. Troubleshooting: Error 800 means certificate expired, contact IT Support. Error 691 means invalid credentials, reset via self-service portal.',
   '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
   true, NOW() - INTERVAL '60 days'),

  ('60000000-0000-0000-0000-000000000002',
   'Password Reset Self-Service Guide',
   'How to Reset Your Password. Steps: 1. Navigate to https://password.company.com. 2. Enter your company email. 3. Verify identity via mobile or backup email. 4. Set a new password. Requirements: Minimum 12 characters, include uppercase, lowercase, number, and special character. Cannot match last 5 passwords. If Account Is Locked: Call IT Helpdesk at ext. 4357 with your Employee ID.',
   '10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000006',
   true, NOW() - INTERVAL '55 days'),

  ('60000000-0000-0000-0000-000000000003',
   'Expense Claim Submission Process',
   'Submitting an Expense Claim. Steps: 1. Log in to Finance Portal at https://finance.company.com. 2. Click New Expense Claim. 3. Fill in date, category, amount, description. 4. Attach receipts (PDF or JPEG max 5 MB). 5. Submit for manager approval. Processing: Manager approval 2 days, Finance processing 3-5 days, Payment next payroll cycle. Note: Claims over $500 require VP approval.',
   '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004',
   true, NOW() - INTERVAL '50 days'),

  ('60000000-0000-0000-0000-000000000004',
   'How to Report a Phishing Email',
   'Reporting a Phishing Email. Red Flags: Unexpected credential requests, urgent or threatening language, suspicious sender addresses, unfamiliar link domains. What To Do: Do NOT click links. Do NOT reply. Forward as attachment to security@company.com. Create helpdesk ticket under Security category. Delete the original email. If You Clicked a Link: Change password immediately and call IT Security at ext. 9911.',
   '10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000006',
   true, NOW() - INTERVAL '45 days'),

  ('60000000-0000-0000-0000-000000000005',
   'Requesting IT Hardware and Equipment',
   'IT Hardware Request Process. Eligible Items: Monitors, keyboards, mice, docking stations, headsets, ergonomic accessories with manager approval. How to Request: Submit a ticket under IT Support or Facilities category with item name, model, and business justification. Attach manager email for items over $300. Delivery: Standard items 3-5 days, specialised items up to 15 days.',
   '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002',
   true, NOW() - INTERVAL '40 days'),

  ('60000000-0000-0000-0000-000000000006',
   'Leave Policy and Balance Management',
   'Leave Policy Overview. Types: Annual Leave 20 days per year, Sick Leave 10 days (medical certificate for 2+ consecutive days), Compassionate Leave up to 5 days. How to Apply: Log in to HR Portal, go to Leave Management, select type and dates, submit for manager approval. Checking Balance: Available in HR Portal under My Profile. Discrepancies must be reported within 30 days.',
   '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003',
   true, NOW() - INTERVAL '35 days')

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 7. TICKET TIMELINE EVENTS
-- =============================================================================
INSERT INTO ticket_timeline (id, ticket_id, actor_id, actor_role, event_type, note, occurred_at) VALUES
  ('70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000007', 'USER',  'TICKET_CREATED',  'Ticket created by user',                      NOW() - INTERVAL '30 days'),
  ('70000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'AGENT', 'TICKET_ASSIGNED', 'Assigned to Alice Chen',                      NOW() - INTERVAL '30 days' + INTERVAL '30 minutes'),
  ('70000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'AGENT', 'STATUS_CHANGED',  'Status changed OPEN to IN_PROGRESS',          NOW() - INTERVAL '30 days' + INTERVAL '1 hour'),
  ('70000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'AGENT', 'STATUS_CHANGED',  'VPN certificate renewed, issue resolved',     NOW() - INTERVAL '29 days'),
  ('70000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000007', 'USER',  'TICKET_CREATED',  'Critical P1 ticket created',                  NOW() - INTERVAL '3 days'),
  ('70000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', 'AGENT', 'PRIORITY_CHANGED','Escalated to URGENT - production down',        NOW() - INTERVAL '3 days' + INTERVAL '5 minutes'),
  ('70000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', 'AGENT', 'STATUS_CHANGED',  'Agent engaged',                               NOW() - INTERVAL '3 days' + INTERVAL '10 minutes'),
  ('70000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', 'AGENT', 'STATUS_CHANGED',  'Server restored after log cleanup',           NOW() - INTERVAL '3 days' + INTERVAL '2 hours'),
  ('70000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000008', 'USER',  'TICKET_CREATED',  'Phishing email reported by user',             NOW() - INTERVAL '26 days'),
  ('70000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000006', 'AGENT', 'STATUS_CHANGED',  'Security team investigating',                 NOW() - INTERVAL '26 days' + INTERVAL '15 minutes'),
  ('70000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000006', 'AGENT', 'STATUS_CHANGED',  'Phishing sender blocked, all users alerted',  NOW() - INTERVAL '26 days' + INTERVAL '3 hours')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 8. NOTIFICATIONS
-- =============================================================================
INSERT INTO notifications (id, user_id, ticket_id, type, message, is_read, created_at) VALUES
  ('80000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000001', 'AGENT_REPLIED',   'Alice Chen replied to your ticket: Cannot connect to VPN',               true,  NOW() - INTERVAL '30 days' + INTERVAL '1 hour'),
  ('80000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000001', 'TICKET_RESOLVED', 'Your ticket "Cannot connect to VPN" has been resolved.',                  true,  NOW() - INTERVAL '29 days'),
  ('80000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'USER_REPLIED',    'Frank Nguyen replied on ticket: Cannot connect to VPN',                  true,  NOW() - INTERVAL '30 days' + INTERVAL '3 hours'),
  ('80000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'TICKET_ASSIGNED', 'Ticket "Cannot connect to VPN" assigned to you.',                        true,  NOW() - INTERVAL '30 days' + INTERVAL '30 minutes'),
  ('80000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000005', 'TICKET_ASSIGNED', 'Your ticket "Critical server down" assigned to Alice Chen.',              true,  NOW() - INTERVAL '3 days' + INTERVAL '10 minutes'),
  ('80000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000005', 'TICKET_RESOLVED', 'Your ticket "Critical server down – production impacted" is resolved.',   true,  NOW() - INTERVAL '3 days' + INTERVAL '2 hours'),
  ('80000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000004', 'NEW_TICKET',      'Your ticket "Email not syncing on mobile" has been submitted.',           false, NOW() - INTERVAL '5 days'),
  ('80000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000003', 'AGENT_REPLIED',   'Alice Chen replied to your ticket: Need admin rights to install dev tools.',false,NOW() - INTERVAL '9 days'),
  ('80000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000006', 'TICKET_RESOLVED', 'Your ticket "Payslip not received for September" has been resolved.',     true,  NOW() - INTERVAL '18 days'),
  ('80000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000014', 'AGENT_REPLIED',   'Eva Patel replied to your security ticket.',                              true,  NOW() - INTERVAL '26 days' + INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 9. EMAIL TEMPLATES
-- =============================================================================
INSERT INTO email_templates (id, template_key, subject_template, body_template, created_at, updated_at) VALUES
  ('90000000-0000-0000-0000-000000000001', 'ticket_created',
   'Ticket #{ticketNumber} Created - {ticketTitle}',
   'Dear {userName}, Your support ticket has been successfully created. Ticket: #{ticketNumber}, Title: {ticketTitle}, Priority: {priority}. Our team will respond within the SLA window. Regards, Aegis Helpdesk Team',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days'),
  ('90000000-0000-0000-0000-000000000002', 'ticket_assigned',
   'Ticket #{ticketNumber} Assigned to an Agent',
   'Dear {userName}, Your ticket {ticketTitle} has been assigned to {agentName}. You will be notified when there is an update. Regards, Aegis Helpdesk Team',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days'),
  ('90000000-0000-0000-0000-000000000003', 'ticket_resolved',
   'Ticket #{ticketNumber} Resolved',
   'Dear {userName}, Your ticket {ticketTitle} has been resolved. If the issue persists, please reopen the ticket. Please take a moment to rate your experience. Regards, Aegis Helpdesk Team',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days'),
  ('90000000-0000-0000-0000-000000000004', 'agent_reply',
   'New Reply on Ticket #{ticketNumber}',
   'Dear {userName}, {agentName} has replied to your ticket {ticketTitle}: {replyMessage}. Log in to the helpdesk portal to view and respond. Regards, Aegis Helpdesk Team',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days'),
  ('90000000-0000-0000-0000-000000000005', 'sla_breach_warning',
   'SLA Breach Warning - Ticket #{ticketNumber}',
   'Dear {agentName}, Ticket #{ticketNumber} {ticketTitle} is approaching SLA breach. Priority: {priority}, SLA Deadline: {slaDeadline}, Current Status: {status}. Please take action immediately. Regards, Aegis Helpdesk System',
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
SELECT 'Seed data inserted successfully.' AS result;
