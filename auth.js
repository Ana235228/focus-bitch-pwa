// ===== AUTHENTICATION UI =====
// Экран входа через Google

function showAuthScreen() {
  const overlay = document.getElementById('authOverlay');
  if (overlay) overlay.style.display = 'flex';
}

function hideAuthScreen() {
  const overlay = document.getElementById('authOverlay');
  if (overlay) overlay.style.display = 'none';
}

function showAuthError(msg) {
  const err = document.getElementById('authError');
  if (err) {
    err.textContent = msg;
    err.style.display = 'block';
  }
}

function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  
  const btn = document.getElementById('googleBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'ВХОДИМ...'; }
  
  fbAuth.signInWithPopup(provider)
    .then(result => {
      console.log('Signed in:', result.user.email);
      // onAuthStateChanged в app.js подхватит и загрузит данные
    })
    .catch(err => {
      console.error('Sign-in error:', err);
      if (btn) { btn.disabled = false; btn.textContent = 'ВОЙТИ ЧЕРЕЗ GOOGLE'; }
      
      if (err.code === 'auth/popup-blocked') {
        showAuthError('Разреши всплывающие окна и попробуй снова');
      } else if (err.code === 'auth/popup-closed-by-user') {
        showAuthError(''); // просто закрыл, не ошибка
      } else if (err.code === 'auth/unauthorized-domain') {
        showAuthError('Домен не авторизован в Firebase. Смотри инструкцию.');
      } else {
        showAuthError('Ошибка входа: ' + err.message);
      }
    });
}

function signOutUser() {
  if (!confirm('Выйти из аккаунта? Данные останутся в облаке.')) return;
  fbAuth.signOut().then(() => {
    location.reload();
  });
}