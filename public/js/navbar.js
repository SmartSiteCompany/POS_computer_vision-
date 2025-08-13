// public/js/navbar.js
export async function mountNavbar() {
  const mount = document.getElementById('navbarMount');
  if (!mount) return;

  const html = await fetch('/partials/navbar.html').then(r => r.text());
  mount.innerHTML = html;

  const btn = mount.querySelector('#logoutBtn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    try {
      await fetch('/logout', { method: 'POST', credentials: 'include' });
    } catch (_) {
      // opcional: log
    } finally {
      location.href = '/login.html';
    }
  });
}

mountNavbar();
