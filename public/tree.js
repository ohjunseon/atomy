const treeContainer = document.getElementById('treeContainer');
const rootInput = document.getElementById('rootInput');
const loadBtn = document.getElementById('loadBtn');
const msg = document.getElementById('msg');

document.getElementById('logoutLink').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  location.href = '/login.html';
});

function fmtPv(v) {
  return v === null || v === undefined || v === '' ? '0' : v;
}

function buildCard(node, isRoot) {
  const card = document.createElement('div');

  if (node.unregistered) {
    card.className = 'card unregistered';
    card.innerHTML = `<div>미등록</div><div class="member-id">${node.memberId || ''}</div>`;
    return card;
  }

  card.className = 'card' + (isRoot ? ' is-root' : '');

  card.innerHTML = `
    <div class="name">${node.name || node.memberId}</div>
    <div class="member-id">${node.memberId}</div>
    <div class="pv-row">
      <div class="pv-box self">
        <div class="pv-label">본인</div>
        <div class="pv-value">${fmtPv(node.selfPv)}</div>
      </div>
      <div class="pv-box cumulative">
        <div class="pv-label">누적</div>
        <div class="pv-value">${fmtPv(node.cumulativePv)}</div>
      </div>
    </div>
    <div class="pv-row">
      <div class="pv-box left">
        <div class="pv-label">좌측</div>
        <div class="pv-value">${fmtPv(node.leftPv)}</div>
      </div>
      <div class="pv-box right">
        <div class="pv-label">우측</div>
        <div class="pv-value">${fmtPv(node.rightPv)}</div>
      </div>
    </div>
  `;
  return card;
}

function buildLi(node, sideLabel, isRoot) {
  const li = document.createElement('li');

  if (sideLabel) {
    const label = document.createElement('span');
    label.className = 'side-label';
    label.textContent = sideLabel;
    li.appendChild(label);
  }

  const wrap = document.createElement('div');
  wrap.appendChild(buildCard(node, isRoot));

  const hasChildren = node.left || node.right;

  if (hasChildren && !node.unregistered) {
    const toggle = document.createElement('button');
    toggle.className = 'toggle-btn';
    toggle.textContent = '-';
    wrap.appendChild(document.createElement('br'));
    wrap.appendChild(toggle);
    li.appendChild(wrap);

    const childUl = document.createElement('ul');
    childUl.appendChild(buildLi(node.left || { unregistered: true, memberId: '' }, '좌', false));
    childUl.appendChild(buildLi(node.right || { unregistered: true, memberId: '' }, '우', false));
    li.appendChild(childUl);

    toggle.addEventListener('click', () => {
      const collapsed = childUl.style.display === 'none';
      childUl.style.display = collapsed ? '' : 'none';
      toggle.textContent = collapsed ? '-' : '+';
    });
  } else {
    li.appendChild(wrap);
  }

  return li;
}

async function loadTree(rootId) {
  msg.textContent = '';
  treeContainer.innerHTML = '';
  if (!rootId) return;

  const res = await fetch(`/api/tree/${encodeURIComponent(rootId)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    msg.textContent = body.error || '조회 실패';
    return;
  }
  const tree = await res.json();

  const rootUl = document.createElement('ul');
  rootUl.className = 'tree';
  rootUl.appendChild(buildLi(tree, null, true));
  treeContainer.appendChild(rootUl);

  localStorage.setItem('atomy_tree_root', rootId);
}

loadBtn.addEventListener('click', () => loadTree(rootInput.value.trim()));
rootInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loadTree(rootInput.value.trim());
});

(async function init() {
  const params = new URLSearchParams(location.search);
  let initialRoot = params.get('root') || localStorage.getItem('atomy_tree_root');

  if (!initialRoot) {
    const res = await fetch('/api/members');
    const members = await res.json();
    if (members.length > 0) initialRoot = members[0].member_id;
  }

  if (initialRoot) {
    rootInput.value = initialRoot;
    loadTree(initialRoot);
  }
})();
