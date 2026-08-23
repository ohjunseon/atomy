import { checkCredentials, createSessionCookie, clearSessionCookie, isValidSession } from './auth.js';
import * as db from './db.js';

const PUBLIC_PATHS = new Set(['/login.html', '/login.js', '/style.css']);
const MAX_DEPTH = 8;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

async function buildTree(DB, memberId, depth, visited) {
  if (!memberId || depth > MAX_DEPTH || visited.has(memberId)) return null;
  visited.add(memberId);

  const member = await db.getMember(DB, memberId);
  const pv = await db.getMemberPv(DB, memberId);

  if (!member) return { memberId, unregistered: true };

  return {
    memberId: member.member_id,
    name: member.name || member.member_id,
    selfPv: pv ? pv.self_pv : null,
    leftPv: pv ? pv.left_pv : null,
    rightPv: pv ? pv.right_pv : null,
    cumulativePv: pv ? pv.cumulative_pv : null,
    updatedAt: pv ? pv.updated_at : null,
    left: await buildTree(DB, member.left_id, depth + 1, visited),
    right: await buildTree(DB, member.right_id, depth + 1, visited),
  };
}

async function handleApi(request, env, url) {
  const { pathname } = url;

  if (pathname === '/api/login' && request.method === 'POST') {
    const { id, password } = await request.json().catch(() => ({}));
    if (!checkCredentials(id, password)) {
      return json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, 401);
    }
    const cookie = await createSessionCookie(env.SESSION_SECRET);
    return json({ ok: true }, 200, { 'Set-Cookie': cookie });
  }

  if (pathname === '/api/logout' && request.method === 'POST') {
    return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
  }

  const authed = await isValidSession(request.headers.get('cookie'), env.SESSION_SECRET);
  if (!authed) return json({ error: '인증이 필요합니다.' }, 401);

  if (pathname === '/api/members' && request.method === 'GET') {
    const members = await db.getAllMembers(env.DB);
    const pvRows = await db.getAllMemberPv(env.DB);
    const pvByMember = Object.fromEntries(pvRows.map((r) => [r.member_id, r]));
    return json(members.map((m) => ({ ...m, pv: pvByMember[m.member_id] || null })));
  }

  if (pathname === '/api/members' && request.method === 'POST') {
    const { memberId, name, leftId, rightId } = await request.json().catch(() => ({}));
    if (!memberId || !memberId.trim()) {
      return json({ error: '회원ID는 필수입니다.' }, 400);
    }
    await db.upsertMember(env.DB, {
      memberId: memberId.trim(),
      name: name ? name.trim() : null,
      leftId: leftId ? leftId.trim() : null,
      rightId: rightId ? rightId.trim() : null,
    });
    return json({ ok: true });
  }

  const memberIdMatch = pathname.match(/^\/api\/members\/([^/]+)$/);
  if (memberIdMatch && request.method === 'DELETE') {
    await db.deleteMember(env.DB, decodeURIComponent(memberIdMatch[1]));
    return json({ ok: true });
  }

  const treeMatch = pathname.match(/^\/api\/tree\/([^/]+)$/);
  if (treeMatch && request.method === 'GET') {
    const tree = await buildTree(env.DB, decodeURIComponent(treeMatch[1]), 0, new Set());
    if (!tree) return json({ error: '회원을 찾을 수 없습니다.' }, 404);
    return json(tree);
  }

  if (pathname === '/api/pv' && request.method === 'POST') {
    const { memberId, selfPv, leftPv, rightPv, cumulativePv } = await request.json().catch(() => ({}));
    if (!memberId) return json({ error: 'memberId는 필수입니다.' }, 400);
    await db.upsertMemberPv(env.DB, { memberId, selfPv, leftPv, rightPv, cumulativePv });
    return json({ ok: true });
  }

  return json({ error: 'Not Found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname.startsWith('/api/')) {
      return handleApi(request, env, url);
    }

    if (PUBLIC_PATHS.has(pathname)) {
      return env.ASSETS.fetch(request);
    }

    const authed = await isValidSession(request.headers.get('cookie'), env.SESSION_SECRET);
    if (!authed) {
      return Response.redirect(new URL('/login.html', request.url), 302);
    }

    return env.ASSETS.fetch(request);
  },
};
