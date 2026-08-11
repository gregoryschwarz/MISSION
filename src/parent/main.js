import { signInWithGoogle, logOut, watchAuthState } from './auth.js';
import {
  findFamilyByParent,
  createFamily,
  createChild,
  fetchChildren,
  fetchChildProfile,
  fetchSessions,
  setFocusType,
  setWeeklyGoalTarget,
  fetchRewards,
  fetchRewardRequests,
  createReward,
  resolveRewardRequest,
} from './family.js';
import { renderDashboard, renderChildrenList } from './dashboard.js';

const root = document.getElementById('app');

function renderAuthForm(error = null) {
  root.innerHTML = `
    <div class="auth-screen">
      <h1>Missions d'Ambre — Espace parent</h1>
      <p class="setup-hint">Suis les progrès de ton enfant et gère ses récompenses.</p>
      ${error ? '<p class="error" id="auth-error"></p>' : ''}
      <button id="google-sign-in" class="google-button">
        <span class="google-icon">G</span> Se connecter avec Google
      </button>
    </div>
  `;
  if (error) {
    root.querySelector('#auth-error').textContent = error;
  }
  root.querySelector('#google-sign-in').addEventListener('click', async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') return;
      console.error('Échec de la connexion Google :', err);
      renderAuthForm(`Connexion impossible (${err.code ?? err.message ?? 'erreur inconnue'}). Réessaie.`);
    }
  });
}

async function copyChildCode(childId) {
  try {
    await navigator.clipboard.writeText(childId);
  } catch (err) {
    // Presse-papiers indisponible (ex. contexte non sécurisé) : rien d'affiché,
    // le parent peut toujours copier le code manuellement à l'écran.
  }
}

function shareChildCode(childId, childName) {
  const text = `Code d'appairage Missions d'Ambre pour ${childName ?? 'ton enfant'} : ${childId}`;
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else {
    copyChildCode(childId);
  }
}

async function loadChildrenList(familyId, error = null) {
  const children = await fetchChildren(familyId);
  renderChildrenList(root, {
    children,
    error,
    onSignOut: logOut,
    onSelectChild: (childId) => loadDashboard(familyId, childId),
    onCopyCode: copyChildCode,
    onShareCode: shareChildCode,
    onAddChild: async ({ childName, pin }) => {
      try {
        const childId = await createChild(familyId, { childName, pin });
        await loadDashboard(familyId, childId);
      } catch (err) {
        await loadChildrenList(familyId, 'Connexion impossible. Vérifie ta connexion et réessaie.');
      }
    },
  });
}

async function loadDashboard(familyId, childId) {
  const [profile, sessions, rewards, rewardRequests] = await Promise.all([
    fetchChildProfile(childId),
    fetchSessions(childId),
    fetchRewards(familyId),
    fetchRewardRequests(childId),
  ]);
  if (!profile) {
    await loadChildrenList(familyId);
    return;
  }
  renderDashboard(root, {
    child: { id: childId },
    profile,
    sessions,
    rewards,
    rewardRequests,
    onBack: () => loadChildrenList(familyId),
    onSignOut: logOut,
    onCopyCode: copyChildCode,
    onShareCode: shareChildCode,
    onSetFocus: async (focusType) => {
      await setFocusType(childId, focusType);
      await loadDashboard(familyId, childId);
    },
    onSetWeeklyGoal: async (target) => {
      await setWeeklyGoalTarget(childId, target);
      await loadDashboard(familyId, childId);
    },
    onCreateReward: async ({ name, cost }) => {
      await createReward(familyId, { name, cost });
      await loadDashboard(familyId, childId);
    },
    onResolveRequest: async (requestId, decision) => {
      const request = rewardRequests.find((r) => r.id === requestId);
      if (!request) return;
      await resolveRewardRequest(childId, profile, request, decision);
      await loadDashboard(familyId, childId);
    },
  });
}

watchAuthState(async (user) => {
  if (!user) {
    renderAuthForm();
    return;
  }
  try {
    let family = await findFamilyByParent(user.uid);
    if (!family) {
      const familyId = await createFamily({ parentUid: user.uid, parentEmail: user.email });
      family = { id: familyId };
    }
    await loadChildrenList(family.id);
  } catch (err) {
    root.innerHTML = '<div class="auth-screen"><p class="error">Connexion impossible. Vérifie ta connexion et recharge la page.</p></div>';
  }
});
