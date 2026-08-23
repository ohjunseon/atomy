const form = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';

  const id = document.getElementById('loginId').value.trim();
  const password = document.getElementById('loginPw').value;

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, password }),
  });

  if (res.ok) {
    const params = new URLSearchParams(location.search);
    location.href = params.get('redirect') || '/tree.html';
    return;
  }

  const body = await res.json().catch(() => ({}));
  errorMsg.textContent = body.error || '로그인에 실패했습니다.';
});
