const { getDb, upsertUser } = require('./db');

const [, , userId, password] = process.argv;

if (!userId || !password) {
  console.log('사용법: node add-user.js <아이디> <비밀번호>');
  process.exit(1);
}

const db = getDb();
upsertUser(db, userId, password);
db.close();

console.log(`저장됨: ${userId}`);
