export const SCHEMA_VERSION = 1;

export const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS project_facts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  statement TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT '{}',
  evidence TEXT NOT NULL DEFAULT '[]',
  confidence TEXT NOT NULL DEFAULT 'low',
  status TEXT NOT NULL DEFAULT 'candidate',
  expires_when TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS impact_maps (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '{}',
  upstream_dependencies TEXT NOT NULL DEFAULT '[]',
  downstream_dependents TEXT NOT NULL DEFAULT '[]',
  contracts_touched TEXT NOT NULL DEFAULT '[]',
  affected_tests TEXT NOT NULL DEFAULT '[]',
  forbidden_changes TEXT NOT NULL DEFAULT '[]',
  risk TEXT NOT NULL DEFAULT '{}',
  review_focus TEXT NOT NULL DEFAULT '[]',
  planned_impact_hash TEXT NOT NULL DEFAULT '',
  actual_impact_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_capsules (
  id TEXT PRIMARY KEY,
  goal TEXT NOT NULL,
  non_goals TEXT NOT NULL DEFAULT '[]',
  writable TEXT NOT NULL DEFAULT '[]',
  readonly_scope TEXT NOT NULL DEFAULT '[]',
  forbidden TEXT NOT NULL DEFAULT '[]',
  must_preserve TEXT NOT NULL DEFAULT '[]',
  affected_modules TEXT NOT NULL DEFAULT '[]',
  required_tests TEXT NOT NULL DEFAULT '[]',
  review_policy TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS context_leases (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  agent_role TEXT NOT NULL,
  can_read TEXT NOT NULL DEFAULT '[]',
  can_write TEXT NOT NULL DEFAULT '[]',
  can_use_facts TEXT NOT NULL DEFAULT '[]',
  tools TEXT NOT NULL DEFAULT '[]',
  expires_at TEXT NOT NULL,
  requires_approval_for TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS review_packets (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE,
  result TEXT NOT NULL DEFAULT 'partial',
  changed_files TEXT NOT NULL DEFAULT '[]',
  intent_diff TEXT NOT NULL DEFAULT '[]',
  impact_map_id TEXT,
  verification TEXT NOT NULL DEFAULT '[]',
  risks TEXT NOT NULL DEFAULT '[]',
  reviewer_focus TEXT NOT NULL DEFAULT '[]',
  unverified_items TEXT NOT NULL DEFAULT '[]',
  memory_updates TEXT NOT NULL DEFAULT '[]',
  suggested_pr TEXT NOT NULL DEFAULT '{}',
  is_out_of_scope INTEGER NOT NULL DEFAULT 0,
  has_breaking_change INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS evidence_stack (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  result TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  details TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export const CREATE_FTS5 = `
CREATE VIRTUAL TABLE IF NOT EXISTS project_facts_fts USING fts5(
  id,
  type,
  statement,
  scope,
  confidence,
  status,
  content=project_facts,
  content_rowid=rowid
);

CREATE TRIGGER IF NOT EXISTS project_facts_ai AFTER INSERT ON project_facts BEGIN
  INSERT INTO project_facts_fts(rowid, id, type, statement, scope, confidence, status)
  VALUES (new.rowid, new.id, new.type, new.statement, new.scope, new.confidence, new.status);
END;

CREATE TRIGGER IF NOT EXISTS project_facts_ad AFTER DELETE ON project_facts BEGIN
  INSERT INTO project_facts_fts(project_facts_fts, rowid, id, type, statement, scope, confidence, status)
  VALUES ('delete', old.rowid, old.id, old.type, old.statement, old.scope, old.confidence, old.status);
END;

CREATE TRIGGER IF NOT EXISTS project_facts_au AFTER UPDATE ON project_facts BEGIN
  INSERT INTO project_facts_fts(project_facts_fts, rowid, id, type, statement, scope, confidence, status)
  VALUES ('delete', old.rowid, old.id, old.type, old.statement, old.scope, old.confidence, old.status);
  INSERT INTO project_facts_fts(rowid, id, type, statement, scope, confidence, status)
  VALUES (new.rowid, new.id, new.type, new.statement, new.scope, new.confidence, new.status);
END;
`;

export const CREATE_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_facts_type ON project_facts(type);
CREATE INDEX IF NOT EXISTS idx_facts_status ON project_facts(status);
CREATE INDEX IF NOT EXISTS idx_facts_confidence ON project_facts(confidence);
CREATE INDEX IF NOT EXISTS idx_impact_maps_task ON impact_maps(task_id);
CREATE INDEX IF NOT EXISTS idx_task_capsules_status ON task_capsules(status);
CREATE INDEX IF NOT EXISTS idx_context_leases_task ON context_leases(task_id);
CREATE INDEX IF NOT EXISTS idx_context_leases_agent ON context_leases(agent_id);
CREATE INDEX IF NOT EXISTS idx_context_leases_status ON context_leases(status);
CREATE INDEX IF NOT EXISTS idx_evidence_task ON evidence_stack(task_id);
CREATE INDEX IF NOT EXISTS idx_evidence_agent ON evidence_stack(agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_agent ON audit_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_facts_project_type ON project_facts(project_path, type);
CREATE INDEX IF NOT EXISTS idx_facts_project_status ON project_facts(project_path, status);
CREATE INDEX IF NOT EXISTS idx_impact_project ON impact_maps(project_path);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON task_capsules(project_path, status);
CREATE INDEX IF NOT EXISTS idx_evidence_task_type ON evidence_entries(task_id, type);
CREATE INDEX IF NOT EXISTS idx_audit_task ON audit_log_entries(task_id);
`;
