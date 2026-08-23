const { chromium } = require('playwright');
const { getDb, getAllMembers, getPassword } = require('./db');

function loadCredentials() {
  const db = getDb();
  const members = getAllMembers(db);
  if (members.length === 0) {
    db.close();
    throw new Error('등록된 회원이 없습니다. 회원정보 조회 화면에서 먼저 등록하세요.');
  }
  const userId = members[0].member_id;
  const password = getPassword(db, userId);
  db.close();
  return { userId, password };
}

async function main() {
  const { userId, password } = loadCredentials();

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://kr.atomy.com/login', { waitUntil: 'domcontentloaded' });

  const idSelectors = [
    'input[name="userId"]',
    'input#userId',
    'input[name="memberId"]',
    'input#memberId',
    'input[placeholder*="아이디"]',
    'input[type="text"]',
  ];
  const pwSelectors = [
    'input[name="password"]',
    'input#password',
    'input[type="password"]',
  ];

  async function fillFirstMatch(selectors, value) {
    for (const sel of selectors) {
      const locator = page.locator(sel).first();
      if (await locator.count() > 0) {
        await locator.fill(value);
        return true;
      }
    }
    return false;
  }

  const idFilled = await fillFirstMatch(idSelectors, userId);
  const pwFilled = await fillFirstMatch(pwSelectors, password);

  if (!idFilled || !pwFilled) {
    console.log('아이디/비밀번호 입력란을 자동으로 찾지 못했습니다. 브라우저에서 직접 확인해주세요.');
    console.log(`아이디: ${userId}`);
    return;
  }

  const loginButtonSelectors = [
    'button:has-text("로그인")',
    'a:has-text("로그인")',
    'input[type="submit"]',
    'button[type="submit"]',
  ];

  let clicked = false;
  for (const sel of loginButtonSelectors) {
    const locator = page.locator(sel).first();
    if (await locator.count() > 0) {
      await locator.click();
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    console.log('로그인 버튼을 자동으로 찾지 못했습니다. 브라우저에서 직접 클릭해주세요.');
  }

  await page.waitForTimeout(3000);
  console.log('현재 URL:', page.url());
  console.log('브라우저를 닫으려면 Ctrl+C를 누르세요. (자동 종료되지 않습니다)');

  await new Promise(() => {});
}

main().catch((err) => {
  console.error('오류 발생:', err.message);
  process.exit(1);
});
