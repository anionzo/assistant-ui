-- User management: ban, reset password, delete, force logout
-- Idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING)

-- Add status column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Add new permissions (54-57)
INSERT INTO permissions (id, code, name, description, resource, action) VALUES
  (54, 'users.ban',             'Ban user',        'Lock or unlock a user account',                   'users', 'ban'),
  (55, 'users.reset_password',  'Reset password',  'Force reset any user''s password',                'users', 'reset_password'),
  (56, 'users.delete',          'Delete user',     'Permanently delete a user account',               'users', 'delete'),
  (57, 'users.force_logout',    'Force logout',    'Revoke all sessions for a user',                  'users', 'force_logout')
ON CONFLICT (id) DO NOTHING;

-- Grant new permissions to super_admin (role 1)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, p.id FROM permissions p WHERE p.id IN (54, 55, 56, 57)
ON CONFLICT (role_id, permission_id) DO NOTHING;
