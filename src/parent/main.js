import { signUp, logIn, logOut, watchAuthState } from './auth.js';
import { findFamilyByParent, createFamily, fetchProfile, fetchSessions } from './family.js';
import { renderDashboard } from './dashboard.js';

const root = document.getElementById('app');

function renderAuthForm(mode = 'login', error = null) {
  root.innerHTML = `
    <div class="auth-screen">
      <h1>Missions de Luna — Espace parent</h1>
      <form id="auth-form">
        <label>Email<input id="email" type="email" required /></label>
        <label>Mot de passe<input id="password" type="password" minlength="6" required /></label>
        ${error ? `<p class="error">${error}</p>` : ''}
        <button type="submit">${mode === 'login' ? 'Se connecter' : 'Créer un compte'}</button>
      </form>
      <button id="toggle-mode">${mode === 'login' ? 'Créer un compte' : "J'ai déjà un compte"}</button>
    </div>
  `;
  root.querySelector('#auth-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = root.querySelector('#email').value.trim();
    const password = root.querySelector('#password').value;
    try {
      if (mode === 'login') {
        await logIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err) {
      renderAuthForm(mode, err.message);
    }
  });
  root.querySelector('#toggle-mode').addEventListener('click', () => {
    renderAuthForm(mode === 'login' ? 'signup' : 'login');
  });
}

function renderFamilySetup(parentUid, parentEmail) {
  root.innerHTML = `
    <div class="family-setup">
      <h1>Bienvenue ! Créons le profil de votre enfant</h1>
      <form id="family-form">
        <label>Prénom de l'enfant<input id="child-name" required /></label>
        <label>Code secret à 4 chiffres<input id="pin" type="password" inputmode="numeric" maxlength="4" required /></label>
        <button type="submit">Créer</button>
      </form>
    </div>
  `;
  root.querySelector('#family-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const childName = root.querySelector('#child-name').value.trim();
    const pin = root.querySelector('#pin').value.trim();
    await createFamily({ parentUid, parentEmail, childName, pin });
    await loadDashboard(parentUid);
  });
}

async function loadDashboard(parentUid) {
  const family = await findFamilyByParent(parentUid);
  if (!family) return;
  const [profile, sessions] = await Promise.all([fetchProfile(family.id), fetchSessions(family.id)]);
  renderDashboard(root, { family, profile, sessions, onSignOut: logOut });
}

watchAuthState(async (user) => {
  if (!user) {
    renderAuthForm();
    return;
  }
  const family = await findFamilyByParent(user.uid);
  if (family) {
    await loadDashboard(user.uid);
  } else {
    renderFamilySetup(user.uid, user.email);
  }
});
