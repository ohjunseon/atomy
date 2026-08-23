const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { encrypt, decrypt } = require('./crypto-util');

const DB_PATH = path.join(__dirname, 'atomy.db');
const DEFAULT_PASSWORD = 'so797979!';

function getDb() {
  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      enc_password TEXT NOT NULL,
      iv TEXT NOT NULL,
      auth_tag TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS pv_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      self_pv TEXT,
      left_pv TEXT,
      right_pv TEXT,
      cumulative_pv TEXT,
      captured_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      member_id TEXT PRIMARY KEY,
      name TEXT,
      left_id TEXT,
      right_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS member_pv (
      member_id TEXT PRIMARY KEY,
      self_pv TEXT,
      left_pv TEXT,
      right_pv TEXT,
      cumulative_pv TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  return db;
}

function upsertUser(db, userId, password) {
  const { encrypted, iv, authTag } = encrypt(password);
  db.prepare(
    `INSERT INTO users (user_id, enc_password, iv, auth_tag)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       enc_password = excluded.enc_password,
       iv = excluded.iv,
       auth_tag = excluded.auth_tag`
  ).run(userId, encrypted, iv, authTag);
}

function getAllUsers(db) {
  const rows = db.prepare('SELECT user_id, enc_password, iv, auth_tag FROM users ORDER BY id').all();
  return rows.map((row) => ({
    userId: row.user_id,
    password: decrypt({ encrypted: row.enc_password, iv: row.iv, authTag: row.auth_tag }),
  }));
}

function getPassword(db, memberId) {
  const row = db
    .prepare('SELECT enc_password, iv, auth_tag FROM users WHERE user_id = ?')
    .get(memberId);
  if (!row) return DEFAULT_PASSWORD;
  return decrypt({ encrypted: row.enc_password, iv: row.iv, authTag: row.auth_tag });
}

function insertPvRecord(db, { userId, selfPv, leftPv, rightPv, cumulativePv }) {
  db.prepare(
    `INSERT INTO pv_records (user_id, self_pv, left_pv, right_pv, cumulative_pv)
     VALUES (?, ?, ?, ?, ?)`
  ).run(userId, selfPv, leftPv, rightPv, cumulativePv);
}

function getPvHistory(db, userId) {
  return db
    .prepare('SELECT * FROM pv_records WHERE user_id = ? ORDER BY captured_at DESC')
    .all(userId);
}

function upsertMember(db, { memberId, name, leftId, rightId }) {
  db.prepare(
    `INSERT INTO members (member_id, name, left_id, right_id)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(member_id) DO UPDATE SET
       name = excluded.name,
       left_id = excluded.left_id,
       right_id = excluded.right_id,
       updated_at = datetime('now')`
  ).run(memberId, name || null, leftId || null, rightId || null);
}

function getMember(db, memberId) {
  return db.prepare('SELECT * FROM members WHERE member_id = ?').get(memberId) || null;
}

function getAllMembers(db) {
  return db.prepare('SELECT * FROM members ORDER BY member_id').all();
}

function deleteMember(db, memberId) {
  db.prepare('DELETE FROM members WHERE member_id = ?').run(memberId);
}

function upsertMemberPv(db, { memberId, selfPv, leftPv, rightPv, cumulativePv }) {
  db.prepare(
    `INSERT INTO member_pv (member_id, self_pv, left_pv, right_pv, cumulative_pv, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(member_id) DO UPDATE SET
       self_pv = excluded.self_pv,
       left_pv = excluded.left_pv,
       right_pv = excluded.right_pv,
       cumulative_pv = excluded.cumulative_pv,
       updated_at = datetime('now')`
  ).run(memberId, selfPv, leftPv, rightPv, cumulativePv);
}

function getMemberPv(db, memberId) {
  return db.prepare('SELECT * FROM member_pv WHERE member_id = ?').get(memberId) || null;
}

function getAllMemberPv(db) {
  return db.prepare('SELECT * FROM member_pv ORDER BY member_id').all();
}

module.exports = {
  getDb,
  upsertUser,
  getAllUsers,
  getPassword,
  DEFAULT_PASSWORD,
  insertPvRecord,
  getPvHistory,
  upsertMember,
  getMember,
  getAllMembers,
  deleteMember,
  upsertMemberPv,
  getMemberPv,
  getAllMemberPv,
  DB_PATH,
};
