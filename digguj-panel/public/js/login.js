import { api } from './api.js';
import { $, hideBrokenImages } from './ui.js';

hideBrokenImages();

function safeNext() {
  const next = new URLSearchParams(location.search).get('next') || '/';
  // Tylko ścieżki w obrębie panelu (bez przekierowań na obce domeny)
  return next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/';
}

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('loginBtn');
  $('loginError').textContent = '';
  btn.disabled = true;
  btn.textContent = '⏳ LOGOWANIE…';
  try {
    await api('/api/auth/login', {
      method: 'POST',
      body: { username: $('username').value, password: $('password').value },
    });
    location.href = safeNext();
  } catch (err) {
    $('loginError').textContent = err.message;
    $('password').value = '';
    $('password').focus();
    btn.disabled = false;
    btn.textContent = 'ZALOGUJ';
  }
});
