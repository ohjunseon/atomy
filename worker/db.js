async function upsertMember(DB, { memberId, name, leftId, rightId }) {
  await DB.prepare(
    `INSERT INTO members (member_id, name, left_id, right_id)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(member_id) DO UPDATE SET
       name = excluded.name,
       left_id = excluded.left_id,
       right_id = excluded.right_id,
       updated_at = datetime('now')`
  ).bind(memberId, name || null, leftId || null, rightId || null).run();
}

async function getMember(DB, memberId) {
  return (await DB.prepare('SELECT * FROM members WHERE member_id = ?').bind(memberId).first()) || null;
}

async function getAllMembers(DB) {
  const { results } = await DB.prepare('SELECT * FROM members ORDER BY member_id').all();
  return results;
}

async function deleteMember(DB, memberId) {
  await DB.prepare('DELETE FROM members WHERE member_id = ?').bind(memberId).run();
}

async function upsertMemberPv(DB, { memberId, selfPv, leftPv, rightPv, cumulativePv }) {
  await DB.prepare(
    `INSERT INTO member_pv (member_id, self_pv, left_pv, right_pv, cumulative_pv, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(member_id) DO UPDATE SET
       self_pv = excluded.self_pv,
       left_pv = excluded.left_pv,
       right_pv = excluded.right_pv,
       cumulative_pv = excluded.cumulative_pv,
       updated_at = datetime('now')`
  ).bind(memberId, selfPv, leftPv, rightPv, cumulativePv).run();
}

async function getMemberPv(DB, memberId) {
  return (await DB.prepare('SELECT * FROM member_pv WHERE member_id = ?').bind(memberId).first()) || null;
}

async function getAllMemberPv(DB) {
  const { results } = await DB.prepare('SELECT * FROM member_pv ORDER BY member_id').all();
  return results;
}

export {
  upsertMember,
  getMember,
  getAllMembers,
  deleteMember,
  upsertMemberPv,
  getMemberPv,
  getAllMemberPv,
};
