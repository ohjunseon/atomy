const fs = require('fs');
const path = require('path');
const { getDb, upsertUser } = require('./db');

const ENV_PATH = path.join(__dirname, '.env');

function parseUsers(raw) {
  const users = [];
  const userMatch = raw.match(/user\s*=\s*\(?([\s\S]*?)\)?\r?\n/);
  if (userMatch) {
    const groupRe = /\{\s*"([^"]*)"\s*,\s*"([^"]*)"\s*\}/g;
    let m;
    while ((m = groupRe.exec(userMatch[1])) !== null) {
      users.push({ userId: m[1], password: m[2] });
    }
  }
  return users;
}

function main() {
  const raw = fs.readFileSync(ENV_PATH, 'utf-8');
  const users = parseUsers(raw);

  if (users.length === 0) {
    console.log('.env에서 user 정보를 찾지 못했습니다. 이미 마이그레이션되었을 수 있습니다.');
    return;
  }

  const db = getDb();
  for (const u of users) {
    upsertUser(db, u.userId, u.password);
    console.log(`저장됨: ${u.userId}`);
  }
  db.close();

  const backupPath = ENV_PATH + '.bak';
  fs.writeFileSync(backupPath, raw, 'utf-8');

  const newEnv = raw.replace(/^user\s*=\s*\([\s\S]*?\)\r?\n?/m, '');
  fs.writeFileSync(ENV_PATH, newEnv, 'utf-8');

  console.log(`\n${users.length}개 계정을 atomy.db로 이전했습니다.`);
  console.log(`.env 백업: ${backupPath} (확인 후 직접 삭제해주세요)`);
  console.log('.env에서 user= 줄을 제거했습니다.');
  console.log('\n주의: secret.key 파일은 비밀번호 복호화에 필요합니다. 유출/삭제되지 않게 보관하세요.');
}

main();
