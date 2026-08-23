const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { getDb, getAllMembers, getPassword, insertPvRecord, upsertMemberPv } = require('./db');

function loadEnv() {
  const raw = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
  const env = {};

  for (const key of ['login_site', 'site1', 'site2', 'event1']) {
    const m = raw.match(new RegExp(`${key}\\s*=\\s*(\\S+)`));
    if (m) env[key] = m[1];
  }

  const db = getDb();
  const members = getAllMembers(db);
  env.users = members.map((m) => ({
    userId: m.member_id,
    password: getPassword(db, m.member_id),
  }));
  db.close();

  return env;
}

async function loginAndGetPv(browser, env, user) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(env.login_site, { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="text"]').first().fill(user.userId);
    await page.locator('input[type="password"]').first().fill(user.password);
    await page.locator('button:has-text("로그인")').first().click();
    await page.waitForTimeout(3000);

    if (page.url().includes('/login')) {
      throw new Error('로그인 실패 (아이디/비밀번호 확인 필요)');
    }

    await page.goto(env.site1, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const screenshotPath = path.join(__dirname, `pv_screenshot_${user.userId}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const pv = await page.evaluate(() => {
      function isVisible(el) {
        return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      }
      function findPv(label) {
        const dtSpans = Array.from(document.querySelectorAll('span.dt'));
        for (const span of dtSpans) {
          if (span.textContent.trim() === label && isVisible(span)) {
            const dl = span.closest('dl.now');
            const dd = dl ? dl.querySelector('dd') : null;
            if (dd) return dd.textContent.trim();
          }
        }
        return null;
      }
      const cumulativePv = document
        .querySelector('#my_sales_container .m-pv dd.pnt')
        ?.textContent.trim() || null;

      return {
        selfPv: findPv('본인 PV'),
        leftPv: findPv('좌 PV'),
        rightPv: findPv('우 PV'),
        cumulativePv,
      };
    });

    return {
      userId: user.userId,
      success: true,
      selfPv: pv.selfPv,
      leftPv: pv.leftPv,
      rightPv: pv.rightPv,
      cumulativePv: pv.cumulativePv,
      screenshot: screenshotPath,
    };
  } catch (err) {
    return { userId: user.userId, success: false, error: err.message };
  } finally {
    await context.close();
  }
}

async function main() {
  const env = loadEnv();
  if (env.users.length === 0) {
    throw new Error('등록된 회원이 없습니다. 회원정보 조회 화면에서 먼저 등록하세요.');
  }

  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const results = [];
  const pvDb = getDb();

  for (const user of env.users) {
    console.log(`\n[${user.userId}] 로그인 중...`);
    const result = await loginAndGetPv(browser, env, user);
    if (result.success) {
      console.log(
        `[${user.userId}] 본인 PV: ${result.selfPv} / 좌 PV: ${result.leftPv} / 우 PV: ${result.rightPv} / 누적 PV: ${result.cumulativePv}`
      );
      upsertMemberPv(pvDb, {
        memberId: user.userId,
        selfPv: result.selfPv,
        leftPv: result.leftPv,
        rightPv: result.rightPv,
        cumulativePv: result.cumulativePv,
      });
      insertPvRecord(pvDb, {
        userId: user.userId,
        selfPv: result.selfPv,
        leftPv: result.leftPv,
        rightPv: result.rightPv,
        cumulativePv: result.cumulativePv,
      });
      if (result.screenshot && fs.existsSync(result.screenshot)) {
        fs.unlinkSync(result.screenshot);
      }
    } else {
      console.log(`[${user.userId}] 실패: ${result.error}`);
    }
    results.push(result);
  }

  pvDb.close();
  await browser.close();

  console.log('\n===== 요약 =====');
  for (const r of results) {
    if (r.success) {
      console.log(`${r.userId}: 본인 ${r.selfPv} / 좌 ${r.leftPv} / 우 ${r.rightPv} / 누적 ${r.cumulativePv}`);
    } else {
      console.log(`${r.userId}: 실패 (${r.error})`);
    }
  }

  fs.writeFileSync(
    path.join(__dirname, 'pv_result.json'),
    JSON.stringify({ capturedAt: new Date().toISOString(), results }, null, 2),
    'utf-8'
  );
  console.log('\n결과 저장: pv_result.json');
}

main().catch((err) => {
  console.error('오류:', err.message);
  process.exit(1);
});
