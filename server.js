const path = require('path');
const express = require('express');
const {
  getDb,
  upsertMember,
  getMember,
  getAllMembers,
  deleteMember,
  getMemberPv,
  getAllMemberPv,
} = require('./db');

const app = express();
app.use(express.json());
app.use(
  express.static(path.join(__dirname, 'public'), {
    etag: false,
    setHeaders: (res) => res.set('Cache-Control', 'no-store'),
  })
);
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

const MAX_DEPTH = 8;

function buildTree(db, memberId, depth, visited) {
  if (!memberId || depth > MAX_DEPTH || visited.has(memberId)) return null;
  visited.add(memberId);

  const member = getMember(db, memberId);
  const pv = getMemberPv(db, memberId);

  if (!member) {
    return { memberId, unregistered: true };
  }

  return {
    memberId: member.member_id,
    name: member.name || member.member_id,
    selfPv: pv ? pv.self_pv : null,
    leftPv: pv ? pv.left_pv : null,
    rightPv: pv ? pv.right_pv : null,
    cumulativePv: pv ? pv.cumulative_pv : null,
    updatedAt: pv ? pv.updated_at : null,
    left: buildTree(db, member.left_id, depth + 1, visited),
    right: buildTree(db, member.right_id, depth + 1, visited),
  };
}

app.get('/api/members', (req, res) => {
  const db = getDb();
  const members = getAllMembers(db);
  const pvRows = getAllMemberPv(db);
  db.close();
  const pvByMember = Object.fromEntries(pvRows.map((r) => [r.member_id, r]));
  res.json(members.map((m) => ({ ...m, pv: pvByMember[m.member_id] || null })));
});

app.post('/api/members', (req, res) => {
  const { memberId, name, leftId, rightId } = req.body;
  if (!memberId || !memberId.trim()) {
    return res.status(400).json({ error: '회원ID는 필수입니다.' });
  }
  const db = getDb();
  upsertMember(db, {
    memberId: memberId.trim(),
    name: name ? name.trim() : null,
    leftId: leftId ? leftId.trim() : null,
    rightId: rightId ? rightId.trim() : null,
  });
  db.close();
  res.json({ ok: true });
});

app.delete('/api/members/:id', (req, res) => {
  const db = getDb();
  deleteMember(db, req.params.id);
  db.close();
  res.json({ ok: true });
});

app.get('/api/tree/:rootId', (req, res) => {
  const db = getDb();
  const tree = buildTree(db, req.params.rootId, 0, new Set());
  db.close();
  if (!tree) return res.status(404).json({ error: '회원을 찾을 수 없습니다.' });
  res.json(tree);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
