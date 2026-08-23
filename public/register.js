const memberIdInput = document.getElementById('memberId');
const nameInput = document.getElementById('name');
const leftIdInput = document.getElementById('leftId');
const rightIdInput = document.getElementById('rightId');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const formTitle = document.getElementById('formTitle');
const memberRows = document.getElementById('memberRows');
const modalOverlay = document.getElementById('modalOverlay');
const openAddBtn = document.getElementById('openAddBtn');
const searchInput = document.getElementById('searchInput');

let editingId = null;
let allMembers = [];

document.getElementById('logoutLink').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  location.href = '/login.html';
});

function openModal() {
  modalOverlay.classList.add('open');
  memberIdInput.focus();
}

function closeModal() {
  modalOverlay.classList.remove('open');
}

function resetForm() {
  editingId = null;
  memberIdInput.value = '';
  memberIdInput.disabled = false;
  nameInput.value = '';
  leftIdInput.value = '';
  rightIdInput.value = '';
  formTitle.textContent = '회원 등록';
}

function renderRows(members) {
  memberRows.innerHTML = '';
  for (const m of members) {
    const tr = document.createElement('tr');
    tr.className = 'edit-row';
    tr.innerHTML = `
      <td>${m.member_id}</td>
      <td>${m.name || ''}</td>
      <td>${m.left_id || ''}</td>
      <td>${m.right_id || ''}</td>
      <td><button data-id="${m.member_id}">삭제</button></td>
    `;
    tr.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      editingId = m.member_id;
      memberIdInput.value = m.member_id;
      memberIdInput.disabled = true;
      nameInput.value = m.name || '';
      leftIdInput.value = m.left_id || '';
      rightIdInput.value = m.right_id || '';
      formTitle.textContent = `회원 수정 (${m.member_id})`;
      openModal();
    });
    tr.querySelector('button').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`${m.member_id} 삭제하시겠습니까?`)) return;
      await fetch(`/api/members/${encodeURIComponent(m.member_id)}`, { method: 'DELETE' });
      loadMembers();
    });
    memberRows.appendChild(tr);
  }
}

function applySearch() {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) {
    renderRows(allMembers);
    return;
  }
  renderRows(
    allMembers.filter(
      (m) =>
        m.member_id.toLowerCase().includes(q) ||
        (m.name || '').toLowerCase().includes(q)
    )
  );
}

async function loadMembers() {
  const res = await fetch('/api/members');
  allMembers = await res.json();
  applySearch();
}

const searchBtn = document.getElementById('searchBtn');

searchInput.addEventListener('input', applySearch);
searchBtn.addEventListener('click', loadMembers);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loadMembers();
});

openAddBtn.addEventListener('click', () => {
  resetForm();
  openModal();
});

saveBtn.addEventListener('click', async () => {
  const memberId = editingId || memberIdInput.value.trim();
  if (!memberId) {
    alert('회원ID를 입력하세요.');
    return;
  }
  const payload = {
    memberId,
    name: nameInput.value.trim(),
    leftId: leftIdInput.value.trim(),
    rightId: rightIdInput.value.trim(),
  };
  const res = await fetch('/api/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    alert(body.error || '저장 실패');
    return;
  }
  closeModal();
  resetForm();
  loadMembers();
});

cancelBtn.addEventListener('click', () => {
  closeModal();
  resetForm();
});

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    closeModal();
    resetForm();
  }
});

loadMembers();
