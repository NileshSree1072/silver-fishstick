-- Migration: Update AI Bot User password with valid BCrypt hash
UPDATE users 
SET password = '$2a$10$QC2TnvQ9R.f4ecwFyjp5R.mQ3I2p44VxheY1.i.9yQJwc2YQUMa6e'
WHERE email = 'ai-bot@helpdesk.com';
