import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../shared/firebaseConfig.js';
import { ensureDeviceAuth } from './authSession.js';
import { getStoredChildId, storeChildId, clearStoredChildId, resolvePairingCode, requestPairing, pairingStatus } from './pairing.js';
import { generateMission, generateSingleTypeMission, QUESTION_TYPES } from './questions.js';
import { generateFrenchMission } from './frenchQuestions.js';
import { createSession, currentQuestion, submitAnswer, recordAnswer, isSessionComplete, finishSession } from './session.js';
import { applyProgression, applyDailyChallenge, applyWeeklyGoal, weekStartKey, levelForXp, xpProgressForLevel, streakStatus, spendCoins, DAILY_CHALLENGE_TARGET } from '../shared/progression.js';
import { enqueueSession, flushQueue } from '../shared/syncQueue.js';
import { renderPairing, renderPairingPending, renderHome, renderNotionPicker, renderCustomize, renderQuestion, renderQuestionQcm, renderPairsRound, renderResults, renderRewards, renderBadgeAlbum, renderConnectionError } from './ui.js';
import { fetchRewards, fetchRewardRequests, requestReward } from '../parent/family.js';
import { BADGES } from '../shared/badges.js';
import { isSoundEnabled, setSoundEnabled, playCorrectSound, playIncorrectSound, playMissionCompleteSound, playLevelUpSound } from './sound.js';
import { auraClassForLevel } from './avatar.js';
import { adjustDifficultyLevels, DEFAULT_DIFFICULTY_LEVELS } from '../shared/difficulty.js';
import { pickMissionMode, getLastMissionMode, storeLastMissionMode } from './missionMode.js';
import { generateChoices } from './choices.js';
import { createPairsRound, attemptMatch, isPairsRoundComplete } from './pairsGame.js';
import {
  characterMedallionData,
  hatMedallionData,
  capeMedallionData,
  decorMedallionData,
  decorGradientCss,
  DEFAULT_CHARACTER,
  DEFAULT_HAT,
  DEFAULT_CAPE,
  DEFAULT_DECOR,
} from '../shared/avatarCustomization.js';

const root = document.getElementById('app');
const MISSION_LENGTH = 10;
const PAUSE_REMINDER_MS = 15 * 60 * 1000;

// childId = code d'appairage de cet enfant (chaque enfant a le sien — support
// multi-enfants). familyId (le compte parent) est retrouvé via le profil une
// fois chargé, et gardé en mémoire pour l'accès au catalogue de récompenses.
let childId = getStoredChildId();
let pendingChildId = null;
let pairingPollTimer = null;
let childFamilyId = null;
let session = null;
let missionMode = 'quiz';
let pairsRound = null;
let lastFeedback = null;
let answerReview = null;
let soundEnabled = isSoundEnabled();
let lastProfile = null;
let helpVisible = false;
let cachedChoices = null;
let cachedChoicesIndex = -1;

async function ensureAuth() {
  await ensureDeviceAuth(auth);
}

async function writeSession(targetChildId, summary) {
  await addDoc(collection(db, 'children', targetChildId, 'sessions'), {
    ...summary,
    timestamp: serverTimestamp(),
  });
}

async function loadProfile(targetChildId) {
  const ref = doc(db, 'children', targetChildId);
  const snapshot = await getDoc(ref);
  return snapshot.exists()
    ? snapshot.data()
    : {
        xp: 0,
        avatarLevel: 1,
        badges: [],
        badgeDates: {},
        dailyChallengeDate: null,
        dailyChallengeProgress: 0,
        dailyChallengeCompleted: false,
        weeklyGoalTarget: 0,
        weeklyRewardText: 'Vendredi et samedi soir : tu peux rester debout plus tard !',
        weeklyRewardDays: ['vendredi', 'samedi'],
        weeklyGoalProgress: 0,
        weeklyGoalWeekStart: null,
        dailyMissionLimit: 3,
        dailyMissionCount: 0,
        dailyMissionCountDate: null,
        streakDays: 0,
        lastSessionDate: null,
        difficultyLevels: DEFAULT_DIFFICULTY_LEVELS,
        perfectMissionsCount: 0,
        totalCorrectCount: 0,
        coins: 0,
        selectedCharacter: DEFAULT_CHARACTER,
        selectedHat: DEFAULT_HAT,
        selectedCape: DEFAULT_CAPE,
        selectedDecor: DEFAULT_DECOR,
        ownedCharacterIds: [],
      };
}

async function saveProfile(targetChildId, profile) {
  const ref = doc(db, 'children', targetChildId);
  await setDoc(ref, profile);
}

function renderHomeScreen(profile) {
  const today = new Date().toISOString().slice(0, 10);
  const dailyChallengeIsToday = profile.dailyChallengeDate === today;
  const weeklyGoalIsThisWeek = profile.weeklyGoalWeekStart === weekStartKey(today);
  renderHome(root, {
    childName: profile.childName,
    avatarLevel: profile.avatarLevel,
    xpProgress: xpProgressForLevel(profile.xp ?? 0),
    streakDays: profile.streakDays ?? 0,
    streakStatus: streakStatus(profile.lastSessionDate ?? null, today),
    totalCorrectCount: profile.totalCorrectCount ?? 0,
    coins: profile.coins ?? 0,
    dailyChallengeProgress: dailyChallengeIsToday ? profile.dailyChallengeProgress ?? 0 : 0,
    dailyChallengeCompleted: dailyChallengeIsToday ? !!profile.dailyChallengeCompleted : false,
    dailyChallengeTarget: DAILY_CHALLENGE_TARGET,
    weeklyGoalTarget: profile.weeklyGoalTarget ?? 0,
    weeklyGoalProgress: weeklyGoalIsThisWeek ? profile.weeklyGoalProgress ?? 0 : 0,
    weeklyRewardText: profile.weeklyRewardText ?? 'Vendredi et samedi soir : tu peux rester debout plus tard !',
    weeklyRewardDays: profile.weeklyRewardDays ?? ['vendredi', 'samedi'],
    dailyMissionLimit: profile.dailyMissionLimit ?? 3,
    dailyMissionCount: profile.dailyMissionCountDate === today ? profile.dailyMissionCount ?? 0 : 0,
    badges: profile.badges,
    auraClass: auraClassForLevel(profile.avatarLevel),
    characterId: profile.selectedCharacter ?? DEFAULT_CHARACTER,
    hatId: profile.selectedHat ?? DEFAULT_HAT,
    capeId: profile.selectedCape ?? DEFAULT_CAPE,
    decorGradient: decorGradientCss(profile.selectedDecor ?? DEFAULT_DECOR),
    soundEnabled,
    focusType: profile.focusType ?? null,
    onStartMission: () => startMission(),
    onToggleSound: toggleSound,
    onCustomize: showCustomize,
    onChooseNotion: showNotionPicker,
    onStartFrenchMission: () => startFrenchMission(),
    onShowRewards: showRewards,
    onShowBadgeAlbum: showBadgeAlbum,
    onNavigate: navigateTo,
  });
}

// Navigation par onglets bas d'écran (Missions/Défis/Avatar/Récompenses),
// affichée sur les 4 écrans "hub" — voir renderHome/renderNotionPicker/
// renderCustomize/renderRewards dans ui.js.
function navigateTo(tab) {
  if (tab === 'missions') return renderHomeScreen(lastProfile);
  if (tab === 'defis') return showNotionPicker();
  if (tab === 'avatar') return showCustomize();
  if (tab === 'recompenses') return showRewards();
}

function showBadgeAlbum() {
  renderBadgeAlbum(root, {
    earnedBadgeIds: lastProfile?.badges ?? [],
    badgeDates: lastProfile?.badgeDates ?? {},
    totalBadgeCount: BADGES.length,
    onBack: () => renderHomeScreen(lastProfile),
  });
}

async function showRewards() {
  try {
    const [allRewards, requests] = await Promise.all([fetchRewards(childFamilyId), fetchRewardRequests(childId)]);
    const rewards = allRewards.filter((reward) => reward.active !== false && reward.archived !== true);
    const pendingRewardIds = requests.filter((r) => r.status === 'pending').map((r) => r.rewardId);
    renderRewards(root, {
      coins: lastProfile?.coins ?? 0,
      rewards,
      pendingRewardIds,
      onRequest: (rewardId) => handleRequestReward(rewards.find((r) => r.id === rewardId)),
      onBack: () => renderHomeScreen(lastProfile),
      onNavigate: navigateTo,
    });
  } catch (err) {
    renderConnectionError(root, { onRetry: showRewards });
  }
}

async function handleRequestReward(reward) {
  if (!reward || !lastProfile) return;
  const result = await requestReward(childId, lastProfile, reward).catch(() => null);
  if (result?.success) {
    lastProfile = { ...lastProfile, coins: result.coins };
  }
  await showRewards();
}

function showNotionPicker() {
  renderNotionPicker(root, {
    types: QUESTION_TYPES,
    difficultyLevels: lastProfile?.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS,
    onSelect: startMission,
    onBack: () => renderHomeScreen(lastProfile),
    onNavigate: navigateTo,
  });
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  setSoundEnabled(soundEnabled);
  if (lastProfile) {
    renderHomeScreen(lastProfile);
  }
}

function rerenderCurrentScreen() {
  if (missionMode === 'pairs') {
    showPairsRound();
  } else {
    showQuestion();
  }
}

function openHelp() {
  helpVisible = true;
  rerenderCurrentScreen();
}

function closeHelp() {
  helpVisible = false;
  rerenderCurrentScreen();
}

function showCustomize() {
  const profile = lastProfile;
  renderCustomize(root, {
    characters: characterMedallionData(profile.avatarLevel, profile.ownedCharacterIds ?? []),
    hats: hatMedallionData(profile.badges, profile.avatarLevel),
    capes: capeMedallionData(profile.badges, profile.avatarLevel),
    decors: decorMedallionData(profile.avatarLevel),
    coins: profile.coins ?? 0,
    selectedCharacterId: profile.selectedCharacter ?? DEFAULT_CHARACTER,
    selectedHatId: profile.selectedHat ?? DEFAULT_HAT,
    selectedCapeId: profile.selectedCape ?? DEFAULT_CAPE,
    selectedDecorId: profile.selectedDecor ?? DEFAULT_DECOR,
    onSelectCharacter: handleSelectCharacter,
    onSelectHat: handleSelectHat,
    onSelectCape: handleSelectCape,
    onSelectDecor: handleSelectDecor,
    onPurchaseCharacter: handlePurchaseCharacter,
    onBack: () => renderHomeScreen(lastProfile),
    onNavigate: navigateTo,
  });
}

async function handleSelectCharacter(characterId) {
  const nextProfile = { ...lastProfile, selectedCharacter: characterId };
  lastProfile = nextProfile;
  await saveProfile(childId, nextProfile).catch(() => {});
  showCustomize();
}

// Déblocage d'un personnage par les pièces plutôt que par le niveau (en
// complément, pas en remplacement) : achat immédiat + équipement automatique.
async function handlePurchaseCharacter(characterId, cost) {
  if (!lastProfile) return;
  const newBalance = spendCoins(lastProfile.coins ?? 0, cost);
  if (newBalance === null) return; // solde insuffisant, rien à faire
  const nextProfile = {
    ...lastProfile,
    coins: newBalance,
    ownedCharacterIds: [...new Set([...(lastProfile.ownedCharacterIds ?? []), characterId])],
    selectedCharacter: characterId,
  };
  lastProfile = nextProfile;
  await saveProfile(childId, nextProfile).catch(() => {});
  showCustomize();
}

async function handleSelectHat(hatId) {
  const nextProfile = { ...lastProfile, selectedHat: hatId };
  lastProfile = nextProfile;
  await saveProfile(childId, nextProfile).catch(() => {});
  showCustomize();
}

async function handleSelectCape(capeId) {
  const nextProfile = { ...lastProfile, selectedCape: capeId };
  lastProfile = nextProfile;
  await saveProfile(childId, nextProfile).catch(() => {});
  showCustomize();
}

async function handleSelectDecor(decorId) {
  const nextProfile = { ...lastProfile, selectedDecor: decorId };
  lastProfile = nextProfile;
  await saveProfile(childId, nextProfile).catch(() => {});
  showCustomize();
}

async function showHome() {
  if (pairingPollTimer) clearTimeout(pairingPollTimer);
  pairingPollTimer = null;
  try {
    await ensureAuth();
    const profile = await loadProfile(childId);
    lastProfile = profile;
    childFamilyId = profile.familyId ?? childFamilyId;
    renderHomeScreen(profile);
    flushQueue((summary) => writeSession(childId, summary)).catch(() => {});
  } catch (err) {
    if (err?.code === 'permission-denied') {
      clearStoredChildId();
      childId = null;
      renderPairing(root, {
        onSubmit: handlePairing,
        error: "Cette tablette doit être autorisée à nouveau par le parent.",
      });
      return;
    }
    renderConnectionError(root, { onRetry: showHome });
  }
}

function startMissionWithQuestions(questions) {
  missionMode = pickMissionMode(getLastMissionMode());
  storeLastMissionMode(missionMode);
  session = createSession(questions);
  lastFeedback = null;
  answerReview = null;
  helpVisible = false;
  cachedChoicesIndex = -1;
  if (missionMode === 'pairs') {
    pairsRound = createPairsRound(session.questions);
    showPairsRound();
  } else {
    showQuestion();
  }
}

function startMission(notionType = null) {
  if (dailyMissionLimitReached()) return renderHomeScreen(lastProfile);
  const difficultyLevels = lastProfile?.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  const questions = notionType
    ? generateSingleTypeMission(MISSION_LENGTH, notionType, difficultyLevels[notionType] ?? 1)
    : generateMission(MISSION_LENGTH, difficultyLevels, lastProfile?.focusType ?? null);
  startMissionWithQuestions(questions);
}

function startFrenchMission() {
  if (dailyMissionLimitReached()) return renderHomeScreen(lastProfile);
  const difficultyLevels = lastProfile?.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  startMissionWithQuestions(generateFrenchMission(MISSION_LENGTH, difficultyLevels));
}

function dailyMissionLimitReached() {
  const limit = lastProfile?.dailyMissionLimit ?? 3;
  if (!limit) return false;
  const today = new Date().toISOString().slice(0, 10);
  const count = lastProfile?.dailyMissionCountDate === today ? lastProfile.dailyMissionCount ?? 0 : 0;
  return count >= limit;
}

function choicesForCurrentQuestion(question) {
  if (cachedChoicesIndex !== session.index) {
    cachedChoices = generateChoices(question);
    cachedChoicesIndex = session.index;
  }
  return cachedChoices;
}

function showQuestion() {
  const question = answerReview?.question ?? currentQuestion(session);
  const questionIndex = answerReview?.index ?? session.index;
  const elapsedMs = Date.now() - session.startedAt;
  const showPauseReminder = elapsedMs >= PAUSE_REMINDER_MS;
  if (missionMode === 'qcm') {
    renderQuestionQcm(root, {
      question,
      choices: answerReview?.choices ?? choicesForCurrentQuestion(question),
      index: questionIndex,
      total: session.questions.length,
      feedback: answerReview?.isCorrect ? 'correct' : answerReview ? 'incorrect' : null,
      selectedAnswer: answerReview?.answer,
      showPauseReminder,
      onAnswer: handleAnswer,
      onContinue: continueAfterAnswer,
      showHelp: helpVisible,
      onOpenHelp: openHelp,
      onCloseHelp: closeHelp,
    });
  } else {
    renderQuestion(root, {
      question,
      index: questionIndex,
      total: session.questions.length,
      feedback: answerReview?.isCorrect ? 'correct' : answerReview ? 'incorrect' : null,
      selectedAnswer: answerReview?.answer,
      showPauseReminder,
      onAnswer: handleAnswer,
      onContinue: continueAfterAnswer,
      showHelp: helpVisible,
      onOpenHelp: openHelp,
      onCloseHelp: closeHelp,
    });
  }
}

function showPairsRound() {
  const elapsedMs = Date.now() - session.startedAt;
  renderPairsRound(root, {
    round: pairsRound,
    feedback: lastFeedback,
    showPauseReminder: elapsedMs >= PAUSE_REMINDER_MS,
    onMatch: handlePairsMatch,
    showHelp: helpVisible,
    onOpenHelp: openHelp,
    onCloseHelp: closeHelp,
  });
}

async function handleAnswer(answer) {
  if (answerReview) return;
  const question = currentQuestion(session);
  const questionIndex = session.index;
  const displayedChoices = missionMode === 'qcm'
    ? [...choicesForCurrentQuestion(question)]
    : question.options
      ? [...question.options]
      : null;
  const isCorrect = submitAnswer(session, answer);
  answerReview = {
    question,
    index: questionIndex,
    answer,
    isCorrect,
    choices: displayedChoices,
  };
  if (soundEnabled) {
    isCorrect ? playCorrectSound() : playIncorrectSound();
  }
  showQuestion();
}

async function continueAfterAnswer() {
  if (!answerReview) return;
  answerReview = null;
  lastFeedback = null;
  if (isSessionComplete(session)) {
    await finishMission();
    return;
  }
  showQuestion();
}

async function handlePairsMatch(calcTileId, resultTileId) {
  const { isCorrect, firstAttempt } = attemptMatch(pairsRound, calcTileId, resultTileId);
  if (firstAttempt) {
    const calcTile = pairsRound.calcTiles.find((t) => t.id === calcTileId);
    recordAnswer(session, calcTile, isCorrect);
  }
  lastFeedback = isCorrect ? 'correct' : 'incorrect';
  if (soundEnabled) {
    isCorrect ? playCorrectSound() : playIncorrectSound();
  }
  if (isPairsRoundComplete(pairsRound)) {
    await finishMission();
  } else {
    showPairsRound();
  }
}

async function finishMission() {
  const summary = finishSession(session);
  const profileBefore = await loadProfile(childId);
  const currentDifficultyLevels = profileBefore.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  const nextDifficultyLevels = adjustDifficultyLevels(currentDifficultyLevels, summary.breakdown);
  const progressionResult = applyProgression(profileBefore, summary, nextDifficultyLevels);
  const dailyChallenge = applyDailyChallenge(profileBefore, summary);
  const weeklyGoal = applyWeeklyGoal(profileBefore, summary);
  const previousWeeklyProgress = profileBefore.weeklyGoalWeekStart === weeklyGoal.weeklyGoalWeekStart ? profileBefore.weeklyGoalProgress ?? 0 : 0;
  const justCompletedWeeklyGoal = weeklyGoal.weeklyGoalTarget > 0 && previousWeeklyProgress < weeklyGoal.weeklyGoalTarget && weeklyGoal.weeklyGoalProgress >= weeklyGoal.weeklyGoalTarget;
  const previousDailyMissionCount = profileBefore.dailyMissionCountDate === summary.date ? profileBefore.dailyMissionCount ?? 0 : 0;
  const finalXp = progressionResult.xp + dailyChallenge.bonusXp;
  const finalCoins = progressionResult.coins + dailyChallenge.bonusCoins;
  const finalAvatarLevel = levelForXp(finalXp);
  const finalLeveledUp = finalAvatarLevel > profileBefore.avatarLevel;
  const nextProfile = {
    ...profileBefore,
    xp: finalXp,
    avatarLevel: finalAvatarLevel,
    streakDays: progressionResult.streakDays,
    badges: progressionResult.badges,
    badgeDates: progressionResult.badgeDates,
    perfectMissionsCount: progressionResult.perfectMissionsCount,
    totalCorrectCount: progressionResult.totalCorrectCount,
    coins: finalCoins,
    dailyChallengeDate: dailyChallenge.dailyChallengeDate,
    dailyChallengeProgress: dailyChallenge.dailyChallengeProgress,
    dailyChallengeCompleted: dailyChallenge.dailyChallengeCompleted,
    weeklyGoalWeekStart: weeklyGoal.weeklyGoalWeekStart,
    weeklyGoalProgress: weeklyGoal.weeklyGoalProgress,
    weeklyGoalTarget: weeklyGoal.weeklyGoalTarget,
    dailyMissionCountDate: summary.date,
    dailyMissionCount: previousDailyMissionCount + 1,
    lastSessionDate: progressionResult.lastSessionDate,
    difficultyLevels: nextDifficultyLevels,
  };
  await saveProfile(childId, nextProfile).catch(() => {});
  try {
    await writeSession(childId, summary);
  } catch (err) {
    enqueueSession(summary);
  }
  if (soundEnabled) {
    playMissionCompleteSound();
    if (finalLeveledUp || progressionResult.newBadges.length > 0) {
      setTimeout(playLevelUpSound, 550);
    }
  }
  pairsRound = null;
  renderResults(root, {
    correctCount: summary.correctCount,
    questionsTotal: summary.questionsTotal,
    gainedXp: finalXp - profileBefore.xp,
    gainedCoins: finalCoins - (profileBefore.coins ?? 0),
    leveledUp: finalLeveledUp,
    newBadges: progressionResult.newBadges,
    justCompletedDailyChallenge: dailyChallenge.justCompletedDailyChallenge,
    justCompletedWeeklyGoal,
    weeklyRewardText: profileBefore.weeklyRewardText,
    onContinue: showHome,
  });
}

async function checkPairingApproval() {
  if (!pendingChildId || !auth.currentUser) return;
  if (pairingPollTimer) clearTimeout(pairingPollTimer);
  pairingPollTimer = null;
  try {
    const status = await pairingStatus(db, pendingChildId, auth.currentUser.uid);
    if (status === 'approved') {
      storeChildId(pendingChildId);
      childId = pendingChildId;
      pendingChildId = null;
      await showHome();
      return;
    }
    renderPairingPending(root, {
      onRetry: checkPairingApproval,
      onCancel: () => {
        if (pairingPollTimer) clearTimeout(pairingPollTimer);
        pairingPollTimer = null;
        pendingChildId = null;
        renderPairing(root, { onSubmit: handlePairing });
      },
      error: status === 'rejected'
        ? "Le parent a refusé cette demande."
        : status === 'missing'
          ? "Demande introuvable. Reviens en arrière et renvoie-la."
          : null,
    });
    if (status === 'pending') {
      pairingPollTimer = setTimeout(checkPairingApproval, 3000);
    }
  } catch (err) {
    renderPairingPending(root, {
      onRetry: checkPairingApproval,
      onCancel: () => renderPairing(root, { onSubmit: handlePairing }),
      error: 'Connexion impossible. Vérifie le Wi-Fi et réessaie.',
    });
  }
}

async function handlePairing({ childId: candidateId }) {
  if (pairingPollTimer) clearTimeout(pairingPollTimer);
  pairingPollTimer = null;
  let result;
  try {
    await ensureAuth();
    const resolvedChildId = await resolvePairingCode(db, candidateId);
    if (!resolvedChildId) {
      renderPairing(root, { onSubmit: handlePairing, error: "Code d'appairage inconnu." });
      return;
    }
    candidateId = resolvedChildId;
    result = await requestPairing(db, candidateId, auth.currentUser.uid);
  } catch (err) {
    const code = err?.code ?? 'erreur-inconnue';
    const message = code === 'auth/operation-not-allowed'
      ? "La connexion anonyme doit être activée dans Firebase Authentication."
      : code === 'permission-denied'
        ? "Cette demande est refusée par les règles de sécurité. Actualise l'application puis réessaie."
        : `Connexion Firebase impossible (${code}). Actualise l'application et réessaie.`;
    renderPairing(root, {
      onSubmit: handlePairing,
      error: message,
    });
    return;
  }
  if (result.success) {
    pendingChildId = candidateId;
    await checkPairingApproval();
  } else {
    renderPairing(root, { onSubmit: handlePairing, error: "Code d'appairage inconnu." });
  }
}

function start() {
  if (childId) {
    showHome();
  } else {
    renderPairing(root, { onSubmit: handlePairing });
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}

start();
