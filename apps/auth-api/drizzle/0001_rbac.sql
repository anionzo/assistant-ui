-- RBAC: roles, permissions, role_permissions, user_roles
-- Idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- All IDs are fixed to allow code-level references

-- ── Tables ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS roles (
  id          INT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  id          INT PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  resource    TEXT NOT NULL,
  action      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INT  NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- ── Seed roles (fixed IDs) ──────────────────────────────

INSERT INTO roles (id, name, description) VALUES
  (1, 'super_admin', 'Full system access — manage users, roles, and all resources'),
  (2, 'admin',       'Operations management — collections, documents, forms, system health'),
  (3, 'operator',    'Content operations — upload, index, publish documents and manage forms'),
  (4, 'viewer',      'Read-only access — view collections, documents, forms, and status'),
  (5, 'user',        'Default chat user — no admin panel access')
ON CONFLICT (id) DO NOTHING;

-- ── Seed permissions (fixed IDs) ────────────────────────
-- ID ranges: 1x=collections, 2x=documents, 3x=files, 4x=forms, 5x=users

INSERT INTO permissions (id, code, name, description, resource, action) VALUES
  -- collections (10-15)
  (10, 'collections.create',   'Create collection',   'Create a new document collection',              'collections', 'create'),
  (11, 'collections.read',     'Read collections',    'View collection list and details',              'collections', 'read'),
  (12, 'collections.update',   'Update collection',   'Edit collection settings and parser config',    'collections', 'update'),
  (13, 'collections.delete',   'Delete collection',   'Remove a collection and its contents',          'collections', 'delete'),
  (14, 'collections.publish',  'Publish corpus',      'Publish collection to chat tenant corpus',      'collections', 'publish'),
  -- documents (20-24)
  (20, 'documents.upload',     'Upload documents',    'Upload files and trigger indexing pipeline',    'documents', 'upload'),
  (21, 'documents.read',       'Read documents',      'View indexed documents and their chunks',       'documents', 'read'),
  (22, 'documents.delete',     'Delete documents',    'Remove a document and its chunks',              'documents', 'delete'),
  (23, 'documents.reprocess',  'Reprocess documents', 'Re-queue a document for re-indexing',           'documents', 'reprocess'),
  -- files (30-32)
  (30, 'files.upload',         'Upload files',        'Upload raw files to collection storage',        'files', 'upload'),
  (31, 'files.read',           'Read files',          'View uploaded file list and metadata',          'files', 'read'),
  (32, 'files.delete',         'Delete files',        'Remove an uploaded file from storage',          'files', 'delete'),
  -- forms (40-43)
  (40, 'forms.create',         'Create forms',        'Ingest a new form template',                    'forms', 'create'),
  (41, 'forms.read',           'Read forms',          'View form list, details and schema',            'forms', 'read'),
  (42, 'forms.delete',         'Delete forms',        'Remove a form template',                        'forms', 'delete'),
  (43, 'forms.search',         'Search forms',        'Full-text search across form schemas',          'forms', 'search'),
  -- users (50-53)
  (50, 'users.list',           'List users',          'View all registered users',                     'users', 'list'),
  (51, 'users.read',           'Read user',           'View user details and roles',                   'users', 'read'),
  (52, 'users.update',         'Update user',         'Edit user profile fields',                      'users', 'update'),
  (53, 'users.assign_roles',   'Assign roles',        'Grant or revoke roles from a user',             'users', 'assign_roles')
ON CONFLICT (id) DO NOTHING;

-- ── Assign permissions to roles ─────────────────────────

-- super_admin (1): all 20 permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, p.id FROM permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- admin (2): collections.*, documents.*, files.*, forms.*
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, p.id FROM permissions p
WHERE p.resource IN ('collections', 'documents', 'files', 'forms')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- operator (3): read+publish collections, docs+files CRUD, read+search forms
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, p.id FROM permissions p
WHERE p.code IN (
  'collections.read', 'collections.publish',
  'documents.upload', 'documents.read', 'documents.delete', 'documents.reprocess',
  'files.upload', 'files.read', 'files.delete',
  'forms.read', 'forms.search'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- viewer (4): read-only
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, p.id FROM permissions p
WHERE p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- user (5): no admin permissions
