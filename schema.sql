CREATE TABLE IF NOT EXISTS members (
  member_id TEXT PRIMARY KEY,
  name TEXT,
  left_id TEXT,
  right_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS member_pv (
  member_id TEXT PRIMARY KEY,
  self_pv TEXT,
  left_pv TEXT,
  right_pv TEXT,
  cumulative_pv TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
