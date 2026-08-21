import { signInWithGoogle, logOut, watchAuthState } from './auth.js';
import {
  findFamilyByParent,
  createFamily,
  createChild,
  fetchChildren,
  ensurePairingCodes,
  fetchPairingRequests,
  approvePairingRequest,
  rejectPairingRequest,
  revokeChildDevice,
  fetchChildProfile,
  fetchSessions,
  setFocusType,
  setWeeklyGoalTarget,
  setDailyMissionLimit,
  ensureDefaultRewards,
  fetchRewards,
  fetchRewardRequests,
  createReward,
  updateReward,
  resolveRewardRequest,
  ensureAvatarPackSettings,
  fetchAvatarPackSettings,
  updateAvatarPackSetting,
} from './family.js';
import { renderDashboard, renderChildrenList, renderPairingRequestsSection } from './dashboard.js';

const root = document.getElementById('app');
let pairingRefreshTimer = null;
let rewardRefreshTimer = null;

function stopPairingRefresh() {
  if (pairingRefreshTimer) clearInterval(pairingRefreshTimer);
  pairingRefreshTimer = null;
}

function stopRewardRefresh() {
  if (rewardRefreshTimer) clearInterval(rewardRefreshTimer);
  rewardRefreshTimer = null;
}

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
  stopPairingRefresh();
  stopRewardRefresh();
  const children = await ensurePairingCodes(await fetchChildren(familyId));
  const pairingRequests = await fetchPairingRequests(children);
  const resolvePairing = async (childId, deviceUid, decision) => {
    if (decision === 'approved') {
      await approvePairingRequest(childId, deviceUid);
    } else {
      await rejectPairingRequest(childId, deviceUid);
    }
    await loadChildrenList(familyId);
  };
  renderChildrenList(root, {
    children,
    pairingRequests,
    error,
    onSignOut: logOut,
    onSelectChild: (childId) => loadDashboard(familyId, childId),
    onCopyCode: copyChildCode,
    onShareCode: shareChildCode,
    onEnableNotifications: async () => {
      if ('Notification' in window) await Notification.requestPermission();
    },
    onAddChild: async ({ childName }) => {
      try {
        const childId = await createChild(familyId, { childName });
        await loadDashboard(familyId, childId);
      } catch (err) {
        await loadChildrenList(familyId, 'Connexion impossible. Vérifie ta connexion et réessaie.');
      }
    },
    onResolvePairing: resolvePairing,
    onRevokeDevice: async (childId) => {
      await revokeChildDevice(childId);
      await loadChildrenList(familyId);
    },
  });
  pairingRefreshTimer = setInterval(async () => {
    try {
      const refreshed = await fetchPairingRequests(children);
      renderPairingRequestsSection(root, refreshed, resolvePairing);
    } catch (err) {
      // La prochaine actualisation retentera silencieusement.
    }
  }, 4000);
}

async function loadDashboard(familyId, childId) {
  stopPairingRefresh();
  stopRewardRefresh();
  await Promise.all([ensureDefaultRewards(familyId), ensureAvatarPackSettings(familyId)]);
  const [profile, sessions, rewards, rewardRequests, avatarPacks] = await Promise.all([
    fetchChildProfile(childId),
    fetchSessions(childId),
    fetchRewards(familyId),
    fetchRewardRequests(childId),
    fetchAvatarPackSettings(familyId),
  ]);
  if (!profile) {
    await loadChildrenList(familyId);
    return;
  }
  renderDashboard(root, {
    child: { id: childId, pairingCode: profile.pairingCode },
    profile,
    sessions,
    rewards,
    rewardRequests,
    avatarPacks,
    onBack: () => loadChildrenList(familyId),
    onSignOut: logOut,
    onCopyCode: copyChildCode,
    onShareCode: shareChildCode,
    onSetFocus: async (focusType) => {
      await setFocusType(childId, focusType);
      await loadDashboard(familyId, childId);
    },
    onSetWeeklyGoal: async ({ target, rewardText, rewardDays }) => {
      await setWeeklyGoalTarget(childId, target, rewardText, rewardDays);
      await loadDashboard(familyId, childId);
    },
    onSetDailyLimit: async (limit) => {
      await setDailyMissionLimit(childId, limit);
      await loadDashboard(familyId, childId);
    },
    onCreateReward: async ({ name, cost, emoji }) => {
      await createReward(familyId, { name, cost, emoji });
      await loadDashboard(familyId, childId);
    },
    onUpdateReward: async (rewardId, changes) => {
      await updateReward(familyId, rewardId, changes);
      await loadDashboard(familyId, childId);
    },
    onUpdateAvatarPack: async (packId, changes) => {
      await updateAvatarPackSetting(familyId, packId, changes);
      await loadDashboard(familyId, childId);
    },
    onSyncAvatarPacks: async () => {
      await ensureAvatarPackSettings(familyId);
      await loadDashboard(familyId, childId);
    },
    onResolveRequest: async (requestId, decision) => {
      const request = rewardRequests.find((r) => r.id === requestId);
      if (!request) return;
      await resolveRewardRequest(childId, profile, request, decision);
      await loadDashboard(familyId, childId);
    },
  });
  let knownPendingCount = rewardRequests.filter((request) => request.status === 'pending').length;
  rewardRefreshTimer = setInterval(async () => {
    try {
      const refreshed = await fetchRewardRequests(childId);
      const pendingCount = refreshed.filter((request) => request.status === 'pending').length;
      if (pendingCount > knownPendingCount && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Nouvelle demande de ' + profile.childName, { body: 'Une récompense attend ta validation.' });
      }
      if (pendingCount !== knownPendingCount) await loadDashboard(familyId, childId);
      knownPendingCount = pendingCount;
    } catch (err) {
      // Une coupure réseau sera retentée au prochain passage.
    }
  }, 10000);
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
