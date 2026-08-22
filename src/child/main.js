import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../shared/firebaseConfig.js';
import { ensureDeviceAuth } from './authSession.js';
import { getStoredChildId, storeChildId, clearStoredChildId, resolvePairingCode, requestPairing, pairingStatus } from './pairing.js';
import { generateMission, generateSingleTypeMission, QUESTION_TYPES } from './questions.js';
import { generateFrenchMission } from './frenchQuestions.js';
import { generateSubjectMission, generateSurpriseMission } from './subjectQuestions.js';
import { createSession, currentQuestion, submitAnswer, recordAnswer, isSessionComplete, finishSession } from './session.js';
import { applyProgression, applyDailyChallenge, applyWeeklyGoal, newlyEarnedChallengeBadges, weekStartKey, levelForXp, xpProgressForLevel, streakStatus, spendCoins, coinRewardBreakdown, availableXp, purchaseXpCoinPack, XP_COIN_PACKS, DAILY_CHALLENGE_TARGET } from '../shared/progression.js';
import { badgeCollectionData, badgeCountsAfterAwards } from '../shared/badges.js';
import { claimDailyAdventureChest, dailyAdventureState, RARE_TREASURES } from '../shared/dailyAdventure.js';
import { seasonForDate } from '../shared/seasons.js';
import { adaptiveMissionPlan, companionMood, normalizeAccessibilityPreferences, offlineSyncState, seasonalEventState, toggleWishlistItem } from '../shared/smartLearning.js';
import { SUBJECTS, normalizeEnabledSubjects, subjectForId } from '../shared/subjects.js';
import { newlyEarnedSubjectBadges, notionLearningStatuses, personalizedLearningPlan, reviewQuestionsFromNotebook, storyChapter, storyProgressAfterMission, subjectMissionCountsAfter, updateLearningNotebook, weeklyLearningTheme } from '../shared/learningExperience.js';
import { diagnosticPlanForSchoolLevel, dueLearningRecap, learnedLessonsAfterLesson, learningLessonForType, progressiveQuestionLevels, scheduleLearningRecap, weakestLearningType } from '../shared/learningPath.js';
import { enqueueSession, flushQueue, readQueue } from '../shared/syncQueue.js';
import { renderPairing, renderPairingPending, renderHome, renderNotionPicker, renderSubjectPicker, renderMiniLesson, renderLearningRecap, renderCustomize, renderQuestion, renderQuestionQcm, renderPairsRound, renderResults, renderRewards, renderBadgeAlbum, renderUnlockCelebration, renderConnectionError } from './ui.js';
import { fetchRewards, fetchRewardRequests, requestReward, fetchAvatarPackSettings } from '../parent/family.js';
import { isSoundEnabled, setSoundEnabled, playCorrectSound, playIncorrectSound, playMissionCompleteSound, playLevelUpSound, speakText } from './sound.js';
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
  hairstyleMedallionData,
  outfitMedallionData,
  companionMedallionData,
  companionAccessoryMedallionData,
  avatarPackData,
  packIdsForSelectedItems,
  purchaseAvatarPack,
  nextCoinPurchaseGoal,
  decorGradientCss,
  DEFAULT_CHARACTER,
  DEFAULT_HAT,
  DEFAULT_CAPE,
  DEFAULT_DECOR,
  DEFAULT_HAIRSTYLE,
  DEFAULT_OUTFIT,
  DEFAULT_COMPANION,
  DEFAULT_COMPANION_ACCESSORY,
  DEFAULT_OWNED_PACK_IDS,
} from '../shared/avatarCustomization.js';

const root = document.getElementById('app');
document.body.dataset.season = seasonForDate();
const MISSION_LENGTH = 10;
const PAUSE_REMINDER_MS = 15 * 60 * 1000;
const ADAPTIVE_HINT_DELAY_MS = 10 * 1000;

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
let avatarPackSettings = [];
let helpVisible = false;
let cachedChoices = null;
let cachedChoicesIndex = -1;
let currentMissionKind = 'standard';
let adaptiveHintTimer = null;
let adaptiveHintVisible = false;
let currentLearningLesson = null;
let lastSpokenQuestionIndex = -1;

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
        badgeCounts: {},
        dailyChallengeDate: null,
        dailyChallengeProgress: 0,
        dailyChallengeCompleted: false,
        weeklyGoalTarget: 0,
        weeklyRewardText: 'Vendredi et samedi soir : tu peux rester debout plus tard !',
        weeklyRewardDays: ['vendredi', 'samedi'],
        weeklyGoalProgress: 0,
        weeklyGoalWeekStart: null,
        dailyChallengeCompletions: 0,
        weeklyGoalCompletions: 0,
        dailyChestDate: null,
        dailyChestCount: 0,
        rareTreasureIds: [],
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
        selectedHairstyle: DEFAULT_HAIRSTYLE,
        selectedOutfit: DEFAULT_OUTFIT,
        selectedCompanion: DEFAULT_COMPANION,
        selectedCompanionAccessory: DEFAULT_COMPANION_ACCESSORY,
        ownedPackIds: DEFAULT_OWNED_PACK_IDS,
        ownedCharacterIds: [],
        enabledSubjects: normalizeEnabledSubjects(),
        schoolLevel: 'CE2',
        assignedSubject: null,
        mistakeNotebook: [],
        learningStats: {},
        learningRecaps: [],
        learnedLessons: [],
        subjectMissionCounts: {},
        storyProgress: 0,
        seasonalMissionCounts: {},
        wishlistItemIds: [],
        familyLearningPlan: { dailyMinutes: 15, schoolDays: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'], preferredSubjects: [] },
        accessibilityPreferences: { textSize: 'normal', dyslexiaMode: false, reducedMotion: false, readInstructions: false },
      };
}

async function saveProfile(targetChildId, profile) {
  const ref = doc(db, 'children', targetChildId);
  await setDoc(ref, profile);
}

function priorityGoalForProfile(profile, today, coinGoal) {
  if (profile.diagnosticCompletedForLevel !== (profile.schoolLevel ?? 'CE2')) {
    return { kind: 'diagnostic', emoji: '🧭', label: `Diagnostic ${profile.schoolLevel ?? 'CE2'}`, detail: '10 questions pour adapter les prochaines missions', action: 'Commencer' };
  }
  const assigned = subjectForId(profile.assignedSubject);
  if (assigned) {
    return { kind: 'assigned-subject', emoji: assigned.emoji, label: `Mission ${assigned.label}`, detail: 'Ton parent te propose cette matière', action: 'Commencer' };
  }
  const adventure = dailyAdventureState(profile, today);
  if (!adventure.completed) {
    return { kind: 'mission', emoji: '🗺️', label: 'Terminer l’aventure du jour', detail: `${adventure.progress}/3 missions avant le coffre`, action: 'Continuer' };
  }
  if (coinGoal?.affordable) {
    return { kind: 'purchase', emoji: coinGoal.emoji, label: coinGoal.name, detail: 'Tu as assez de pièces pour l’obtenir', action: 'Acheter' };
  }
  const nextBadge = badgeCollectionData(profile)
    .filter((badge) => !badge.earned && !badge.secret)
    .sort((a, b) => b.progressPercent - a.progressPercent)[0];
  if (nextBadge) {
    return { kind: 'badge', emoji: nextBadge.emoji, label: nextBadge.label, detail: `${nextBadge.description} · ${nextBadge.progressLabel}`, action: 'Voir' };
  }
  return { kind: 'complete', emoji: '👑', label: 'Toutes les collections avancent', detail: 'Continue à battre tes records !', action: 'Jouer' };
}

function renderHomeScreen(profile) {
  const today = new Date().toISOString().slice(0, 10);
  const dailyChallengeIsToday = profile.dailyChallengeDate === today;
  const weeklyGoalIsThisWeek = profile.weeklyGoalWeekStart === weekStartKey(today);
  const coinGoal = nextCoinPurchaseGoal(profile, avatarPackSettings);
  const syncState = offlineSyncState(readQueue().length, navigator.onLine);
  renderHome(root, {
    childName: profile.childName,
    avatarLevel: profile.avatarLevel,
    xpProgress: xpProgressForLevel(profile.xp ?? 0),
    streakDays: profile.streakDays ?? 0,
    streakStatus: streakStatus(profile.lastSessionDate ?? null, today),
    totalCorrectCount: profile.totalCorrectCount ?? 0,
    coins: profile.coins ?? 0,
    coinGoal,
    priorityGoal: priorityGoalForProfile(profile, today, coinGoal),
    dailyAdventure: dailyAdventureState(profile, today),
    weeklyTheme: weeklyLearningTheme(today),
    story: { progress: profile.storyProgress ?? 0, chapter: storyChapter(profile.storyProgress ?? 0) },
    seasonalEvent: seasonalEventState(profile),
    companionMoodState: companionMood(profile, today),
    syncState,
    adaptivePlan: adaptiveMissionPlan(profile),
    familyLearningPlan: profile.familyLearningPlan,
    rareTreasures: RARE_TREASURES.filter((treasure) => (profile.rareTreasureIds ?? []).includes(treasure.id)),
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
    badgeCounts: profile.badgeCounts ?? {},
    auraClass: auraClassForLevel(profile.avatarLevel),
    characterId: profile.selectedCharacter ?? DEFAULT_CHARACTER,
    hatId: profile.selectedHat ?? DEFAULT_HAT,
    capeId: profile.selectedCape ?? DEFAULT_CAPE,
    hairstyleId: profile.selectedHairstyle ?? DEFAULT_HAIRSTYLE,
    outfitId: profile.selectedOutfit ?? DEFAULT_OUTFIT,
    companionId: profile.selectedCompanion ?? DEFAULT_COMPANION,
    companionAccessoryId: profile.selectedCompanionAccessory ?? DEFAULT_COMPANION_ACCESSORY,
    decorGradient: decorGradientCss(profile.selectedDecor ?? DEFAULT_DECOR),
    decorId: profile.selectedDecor ?? DEFAULT_DECOR,
    soundEnabled,
    focusType: profile.focusType ?? null,
    onStartMission: () => startMission(),
    onToggleSound: toggleSound,
    onCustomize: showCustomize,
    onChooseNotion: showNotionPicker,
    onChooseSubject: showSubjectPicker,
    onStartWeeklyTheme: startWeeklyThemeMission,
    onStartStory: startSurpriseMission,
    onShowRewards: showRewards,
    onShowBadgeAlbum: showBadgeAlbum,
    onCoinGoalAction: handleHomeCoinGoal,
    onPriorityAction: (kind) => {
      if (kind === 'diagnostic') return startDiagnosticMission();
      if (kind === 'purchase') return handleHomeCoinGoal();
      if (kind === 'badge') return showBadgeAlbum();
      if (kind === 'assigned-subject' && subjectForId(profile.assignedSubject)) return startSubjectMission(profile.assignedSubject);
      return startMission();
    },
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
    profile: lastProfile ?? {},
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
      totalXp: lastProfile?.xp ?? 0,
      availableXp: availableXp(lastProfile ?? {}),
      coinPacks: XP_COIN_PACKS,
      rewards,
      pendingRewardIds,
      wishlistItemIds: lastProfile?.wishlistItemIds ?? [],
      onRequest: (rewardId) => handleRequestReward(rewards.find((r) => r.id === rewardId)),
      onToggleWishlist: async (rewardId) => {
        lastProfile = { ...lastProfile, wishlistItemIds: toggleWishlistItem(lastProfile?.wishlistItemIds ?? [], rewardId) };
        await saveProfile(childId, lastProfile).catch(() => {});
        await showRewards();
      },
      onBuyCoinPack: handleBuyCoinPack,
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
  const learningStatuses = notionLearningStatuses([{ breakdown: lastProfile?.learningStats ?? {} }], 1);
  renderNotionPicker(root, {
    types: QUESTION_TYPES,
    difficultyLevels: lastProfile?.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS,
    learningStatuses: Object.fromEntries(learningStatuses.map((item) => [item.type, item.status])),
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
  let profile = lastProfile;
  const selectedPackIds = packIdsForSelectedItems([
    profile.selectedHairstyle ?? DEFAULT_HAIRSTYLE,
    profile.selectedOutfit ?? DEFAULT_OUTFIT,
    profile.selectedCompanion ?? DEFAULT_COMPANION,
    profile.selectedCompanionAccessory ?? DEFAULT_COMPANION_ACCESSORY,
    profile.selectedDecor ?? DEFAULT_DECOR,
  ]);
  const ownedPackIds = [...new Set([
    ...DEFAULT_OWNED_PACK_IDS,
    ...(profile.ownedPackIds ?? []),
    ...selectedPackIds,
  ])];
  const storedPackIds = profile.ownedPackIds ?? [];
  if (ownedPackIds.some((id) => !storedPackIds.includes(id)) || storedPackIds.some((id) => !ownedPackIds.includes(id))) {
    profile = { ...profile, ownedPackIds };
    lastProfile = profile;
    saveProfile(childId, profile).catch(() => {});
  }
  renderCustomize(root, {
    characters: characterMedallionData(profile.avatarLevel, profile.ownedCharacterIds ?? []),
    hats: hatMedallionData(profile.badges, profile.avatarLevel),
    capes: capeMedallionData(profile.badges, profile.avatarLevel),
    hairstyles: hairstyleMedallionData(ownedPackIds),
    outfits: outfitMedallionData(ownedPackIds),
    companions: companionMedallionData(ownedPackIds),
    companionAccessories: companionAccessoryMedallionData(ownedPackIds),
    packs: avatarPackData(profile.avatarLevel, ownedPackIds, avatarPackSettings)
      .filter((pack) => pack.active || pack.owned),
    decors: decorMedallionData(profile.avatarLevel, ownedPackIds),
    coins: profile.coins ?? 0,
    selectedCharacterId: profile.selectedCharacter ?? DEFAULT_CHARACTER,
    selectedHatId: profile.selectedHat ?? DEFAULT_HAT,
    selectedCapeId: profile.selectedCape ?? DEFAULT_CAPE,
    selectedDecorId: profile.selectedDecor ?? DEFAULT_DECOR,
    selectedHairstyleId: profile.selectedHairstyle ?? DEFAULT_HAIRSTYLE,
    selectedOutfitId: profile.selectedOutfit ?? DEFAULT_OUTFIT,
    selectedCompanionId: profile.selectedCompanion ?? DEFAULT_COMPANION,
    selectedCompanionAccessoryId: profile.selectedCompanionAccessory ?? DEFAULT_COMPANION_ACCESSORY,
    onSelectCharacter: handleSelectCharacter,
    onSelectHat: handleSelectHat,
    onSelectCape: handleSelectCape,
    onSelectDecor: handleSelectDecor,
    onSelectHairstyle: handleSelectHairstyle,
    onSelectOutfit: handleSelectOutfit,
    onSelectCompanion: handleSelectCompanion,
    onSelectCompanionAccessory: handleSelectCompanionAccessory,
    onPurchaseCharacter: handlePurchaseCharacter,
    onPurchasePack: handlePurchasePack,
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
  const item = characterMedallionData(nextProfile.avatarLevel, nextProfile.ownedCharacterIds).find((character) => character.id === characterId);
  renderUnlockCelebration(root, {
    emoji: item?.emoji ?? '🦸‍♀️',
    title: 'Nouveau personnage débloqué !',
    description: `${item?.name ?? 'Ton personnage'} est déjà équipé.`,
    actionLabel: 'Voir mon personnage',
    onContinue: showCustomize,
  });
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

function showSubjectPicker() {
  const enabledSubjectIds = new Set(normalizeEnabledSubjects(lastProfile?.enabledSubjects));
  const dueRecap = dueLearningRecap(lastProfile?.learningRecaps ?? []);
  const dueNotebookCount = personalizedLearningPlan(lastProfile?.mistakeNotebook ?? []).reviewQuestions.length;
  renderSubjectPicker(root, {
    subjects: SUBJECTS.filter((subject) => enabledSubjectIds.has(subject.id)),
    difficultyLevels: lastProfile?.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS,
    schoolLevel: lastProfile?.schoolLevel ?? 'CE2',
    mistakeCount: lastProfile?.mistakeNotebook?.length ?? 0,
    dueReviewCount: dueNotebookCount + (dueRecap ? 1 : 0),
    weeklyTheme: weeklyLearningTheme(),
    assignedSubject: lastProfile?.assignedSubject ?? null,
    learningTarget: weakestLearningType(lastProfile ?? {}),
    onSelect: startSubjectMission,
    onStartFrench: startFrenchMission,
    onStartSurprise: startSurpriseMission,
    onStartPersonalized: startPersonalizedMission,
    onStartLearning: startLearningPath,
    onStartDiagnostic: startDiagnosticMission,
    onReviewMistakes: startMistakeReview,
    onStartWeeklyTheme: startWeeklyThemeMission,
    onBack: () => renderHomeScreen(lastProfile),
    onNavigate: navigateTo,
  });
}

async function handleBuyCoinPack(packId) {
  if (!lastProfile) return;
  const purchase = purchaseXpCoinPack(lastProfile, packId);
  if (!purchase.success) return;
  lastProfile = { ...lastProfile, coins: purchase.coins, spentXp: purchase.spentXp };
  await saveProfile(childId, lastProfile).catch(() => {});
  await showRewards();
}

async function handlePurchasePack(packId) {
  if (!lastProfile) return;
  const purchase = purchaseAvatarPack(lastProfile, packId, avatarPackSettings);
  if (!purchase.success) return;
  const nextProfile = {
    ...lastProfile,
    coins: purchase.coins,
    ownedPackIds: purchase.ownedPackIds,
  };
  lastProfile = nextProfile;
  await saveProfile(childId, nextProfile).catch(() => {});
  const pack = avatarPackData(nextProfile.avatarLevel, nextProfile.ownedPackIds, avatarPackSettings).find((item) => item.id === packId);
  renderUnlockCelebration(root, {
    emoji: pack?.emoji ?? '🎁',
    title: 'Nouveau pack débloqué !',
    description: `${pack?.name ?? 'Ton pack'} rejoint maintenant ta collection.`,
    actionLabel: 'Choisir mes nouveaux objets',
    onContinue: showCustomize,
  });
}

function handleHomeCoinGoal() {
  if (!lastProfile) return;
  const goal = nextCoinPurchaseGoal(lastProfile, avatarPackSettings);
  if (!goal?.affordable) return showCustomize();
  if (goal.kind === 'personnage') return handlePurchaseCharacter(goal.id, goal.cost);
  return handlePurchasePack(goal.id);
}

async function selectAvatarPart(field, value) {
  const nextProfile = { ...lastProfile, [field]: value };
  lastProfile = nextProfile;
  await saveProfile(childId, nextProfile).catch(() => {});
  showCustomize();
}

function handleSelectHairstyle(hairstyleId) {
  return selectAvatarPart('selectedHairstyle', hairstyleId);
}

function handleSelectOutfit(outfitId) {
  return selectAvatarPart('selectedOutfit', outfitId);
}

function handleSelectCompanion(companionId) {
  return selectAvatarPart('selectedCompanion', companionId);
}

function handleSelectCompanionAccessory(accessoryId) {
  return selectAvatarPart('selectedCompanionAccessory', accessoryId);
}

async function showHome() {
  if (pairingPollTimer) clearTimeout(pairingPollTimer);
  pairingPollTimer = null;
  try {
    await ensureAuth();
    const profile = await loadProfile(childId);
    lastProfile = profile;
    const accessibility = normalizeAccessibilityPreferences(profile.accessibilityPreferences);
    document.body.dataset.textSize = accessibility.textSize;
    document.body.dataset.dyslexia = accessibility.dyslexiaMode ? 'true' : 'false';
    document.body.dataset.reducedMotion = accessibility.reducedMotion ? 'true' : 'false';
    childFamilyId = profile.familyId ?? childFamilyId;
    avatarPackSettings = childFamilyId
      ? await fetchAvatarPackSettings(childFamilyId).catch(() => [])
      : [];
    renderHomeScreen(profile);
    flushQueue((summary) => writeSession(childId, summary))
      .then(() => { if (lastProfile === profile) renderHomeScreen(profile); })
      .catch(() => {});
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

function startMissionWithQuestions(questions, forcedMode = null, subject = null, missionKind = 'standard') {
  if (adaptiveHintTimer) clearTimeout(adaptiveHintTimer);
  missionMode = forcedMode ?? pickMissionMode(getLastMissionMode());
  if (!forcedMode) storeLastMissionMode(missionMode);
  session = createSession(questions, subject);
  session.adaptiveRetriesEnabled = missionKind !== 'diagnostic';
  currentMissionKind = missionKind;
  if (missionKind !== 'learning') currentLearningLesson = null;
  lastFeedback = null;
  answerReview = null;
  helpVisible = false;
  cachedChoicesIndex = -1;
  adaptiveHintVisible = false;
  lastSpokenQuestionIndex = -1;
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
  const adaptivePlan = adaptiveMissionPlan(lastProfile ?? {});
  const questions = notionType
    ? generateSingleTypeMission(MISSION_LENGTH, notionType, difficultyLevels[notionType] ?? 1)
    : generateMission(
        MISSION_LENGTH,
        { ...difficultyLevels, [adaptivePlan.targetType]: adaptivePlan.difficulty },
        lastProfile?.focusType ?? adaptivePlan.targetType
      );
  startMissionWithQuestions(questions, null, 'mathematiques');
}

function startFrenchMission() {
  if (dailyMissionLimitReached()) return renderHomeScreen(lastProfile);
  const difficultyLevels = lastProfile?.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  startMissionWithQuestions(generateFrenchMission(MISSION_LENGTH, difficultyLevels), 'qcm', 'francais');
}

function startSubjectMission(subjectId) {
  if (dailyMissionLimitReached()) return renderHomeScreen(lastProfile);
  const enabledSubjectIds = normalizeEnabledSubjects(lastProfile?.enabledSubjects);
  if (!enabledSubjectIds.includes(subjectId)) return showSubjectPicker();
  const difficultyLevels = lastProfile?.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  startMissionWithQuestions(generateSubjectMission(subjectId, MISSION_LENGTH, difficultyLevels, { schoolLevel: lastProfile?.schoolLevel }), 'quiz', subjectId);
}

function startSurpriseMission() {
  if (dailyMissionLimitReached()) return renderHomeScreen(lastProfile);
  const enabledSubjectIds = normalizeEnabledSubjects(lastProfile?.enabledSubjects);
  const questions = generateSurpriseMission(enabledSubjectIds, MISSION_LENGTH, lastProfile?.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS, { schoolLevel: lastProfile?.schoolLevel });
  if (!questions.length) return showSubjectPicker();
  startMissionWithQuestions(questions, 'quiz', 'surprise', 'surprise');
}

function startWeeklyThemeMission() {
  if (dailyMissionLimitReached()) return renderHomeScreen(lastProfile);
  const theme = weeklyLearningTheme();
  const enabled = normalizeEnabledSubjects(lastProfile?.enabledSubjects);
  const themedSubjects = theme.subjectIds.filter((subjectId) => enabled.includes(subjectId));
  const candidates = themedSubjects.length ? themedSubjects : enabled;
  const questions = generateSurpriseMission(candidates, MISSION_LENGTH, lastProfile?.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS, { schoolLevel: lastProfile?.schoolLevel });
  if (!questions.length) return showSubjectPicker();
  startMissionWithQuestions(questions, 'quiz', 'theme', 'weekly-theme');
}

function startMistakeReview() {
  const dueRecap = dueLearningRecap(lastProfile?.learningRecaps ?? []);
  let questions = reviewQuestionsFromNotebook(lastProfile?.mistakeNotebook ?? [], MISSION_LENGTH);
  if (dueRecap) {
    const recapQuestions = questions.filter((question) => question.type === dueRecap.type);
    const otherQuestions = questions.filter((question) => question.type !== dueRecap.type);
    if (!recapQuestions.length) recapQuestions.push(...freshQuestionsForType(dueRecap.type, 3));
    questions = [...recapQuestions, ...otherQuestions].slice(0, MISSION_LENGTH);
    if (!questions.length) questions = generateMission(3, lastProfile?.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS);
    renderLearningRecap(root, {
      recap: dueRecap,
      onStart: async () => {
        lastProfile = { ...lastProfile, learningRecaps: (lastProfile.learningRecaps ?? []).filter((entry) => entry.type !== dueRecap.type) };
        await saveProfile(childId, lastProfile).catch(() => {});
        startMissionWithQuestions(questions, 'quiz', 'revision', 'mistake-review');
      },
      onBack: showSubjectPicker,
    });
    return;
  }
  if (!questions.length) return showSubjectPicker();
  startMissionWithQuestions(questions, 'quiz', 'revision', 'mistake-review');
}

function freshQuestionsForType(type, count, forcedLevel = null) {
  const difficultyLevels = lastProfile?.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  const level = forcedLevel ?? difficultyLevels[type] ?? 1;
  if (QUESTION_TYPES.includes(type)) {
    return generateSingleTypeMission(count, type, level);
  }
  if (type === 'accord-pluriel') return generateFrenchMission(count, { ...difficultyLevels, 'accord-pluriel': level });
  if (subjectForId(type) && normalizeEnabledSubjects(lastProfile?.enabledSubjects).includes(type)) {
    return generateSubjectMission(type, count, { ...difficultyLevels, [type]: level }, { schoolLevel: lastProfile?.schoolLevel });
  }
  return [];
}

function startPersonalizedMission() {
  if (dailyMissionLimitReached()) return renderHomeScreen(lastProfile);
  const plan = personalizedLearningPlan(lastProfile?.mistakeNotebook ?? [], MISSION_LENGTH);
  const candidates = [...plan.reviewQuestions];
  plan.priorityTypes.forEach((type) => candidates.push(...freshQuestionsForType(type, 2)));
  candidates.push(...generateMission(MISSION_LENGTH, lastProfile?.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS, lastProfile?.focusType ?? null));
  const seen = new Set();
  const questions = candidates.filter((question) => {
    const key = `${question.type}::${question.prompt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, MISSION_LENGTH);
  startMissionWithQuestions(questions, 'quiz', 'revision', 'personalized');
}

function progressiveQuestionsForType(type) {
  const difficulty = lastProfile?.difficultyLevels?.[type] ?? 1;
  const levels = progressiveQuestionLevels(difficulty, lastProfile?.schoolLevel ?? 'CE2');
  const stages = ['facile', 'guide', 'autonome'];
  const seen = new Set();
  return levels.map((level, index) => {
    let selected = null;
    for (let attempt = 0; attempt < 8 && !selected; attempt += 1) {
      const candidate = freshQuestionsForType(type, 1, level)[0];
      const key = candidate ? `${candidate.type}::${candidate.prompt}` : null;
      if (candidate && !seen.has(key)) {
        seen.add(key);
        selected = candidate;
      }
    }
    return selected ? { ...selected, learningStage: stages[index] } : null;
  }).filter(Boolean);
}

function startLearningPath() {
  if (dailyMissionLimitReached()) return renderHomeScreen(lastProfile);
  let type = weakestLearningType(lastProfile ?? {});
  let questions = progressiveQuestionsForType(type);
  if (questions.length < 3) {
    type = 'addition';
    questions = progressiveQuestionsForType(type);
  }
  const previousLesson = (lastProfile?.learnedLessons ?? []).find((entry) => entry.type === type);
  currentLearningLesson = learningLessonForType(type, questions[0], lastProfile?.schoolLevel ?? 'CE2', previousLesson?.lessonCount ?? 0);
  renderMiniLesson(root, {
    lesson: currentLearningLesson,
    onStart: () => startMissionWithQuestions(questions, 'quiz', type, 'learning'),
    onBack: showSubjectPicker,
  });
}

function startDiagnosticMission() {
  if (dailyMissionLimitReached()) return renderHomeScreen(lastProfile);
  const plan = diagnosticPlanForSchoolLevel(lastProfile?.schoolLevel ?? 'CE2');
  const questions = plan.map(({ type, level }) => freshQuestionsForType(type, 1, level)[0]).filter(Boolean);
  if (questions.length < MISSION_LENGTH) {
    questions.push(...generateMission(MISSION_LENGTH - questions.length, lastProfile?.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS));
  }
  startMissionWithQuestions(questions.slice(0, MISSION_LENGTH), 'quiz', 'diagnostic', 'diagnostic');
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
  const plannedMinutes = Number(lastProfile?.familyLearningPlan?.dailyMinutes) || (PAUSE_REMINDER_MS / 60000);
  const showPauseReminder = elapsedMs >= plannedMinutes * 60 * 1000;
  if (missionMode === 'qcm') {
    renderQuestionQcm(root, {
      question,
      choices: answerReview?.choices ?? choicesForCurrentQuestion(question),
      index: questionIndex,
      total: session.questions.length,
      feedback: answerReview?.isCorrect ? 'correct' : answerReview ? 'incorrect' : null,
      showAdaptiveHint: currentMissionKind === 'learning' && (adaptiveHintVisible || question.learningStage === 'guide'),
      selectedAnswer: answerReview?.answer,
      showPauseReminder,
      onAnswer: handleAnswer,
      onContinue: continueAfterAnswer,
      showHelp: helpVisible,
      onOpenHelp: openHelp,
      onCloseHelp: closeHelp,
      onSpeak: (text, language) => speakText(text, language),
    });
  } else {
    renderQuestion(root, {
      question,
      index: questionIndex,
      total: session.questions.length,
      feedback: answerReview?.isCorrect ? 'correct' : answerReview ? 'incorrect' : null,
      showAdaptiveHint: currentMissionKind === 'learning' && (adaptiveHintVisible || question.learningStage === 'guide'),
      selectedAnswer: answerReview?.answer,
      showPauseReminder,
      onAnswer: handleAnswer,
      onContinue: continueAfterAnswer,
      showHelp: helpVisible,
      onOpenHelp: openHelp,
      onCloseHelp: closeHelp,
      onSpeak: (text, language) => speakText(text, language),
    });
  }
  if (!answerReview && lastProfile?.accessibilityPreferences?.readInstructions && lastSpokenQuestionIndex !== questionIndex) {
    lastSpokenQuestionIndex = questionIndex;
    speakText(question.audioText ?? question.prompt, question.audioText ? 'en-GB' : 'fr-FR');
  }
  if (adaptiveHintTimer) clearTimeout(adaptiveHintTimer);
  if (currentMissionKind === 'learning' && !answerReview && question.learningStage !== 'guide' && !adaptiveHintVisible) {
    const expectedIndex = session.index;
    adaptiveHintTimer = setTimeout(() => {
      if (session?.index === expectedIndex && !answerReview) {
        adaptiveHintVisible = true;
        showQuestion();
      }
    }, ADAPTIVE_HINT_DELAY_MS);
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
  if (adaptiveHintTimer) clearTimeout(adaptiveHintTimer);
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
  adaptiveHintVisible = false;
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
    const resultTile = pairsRound.resultTiles.find((t) => t.id === resultTileId);
    recordAnswer(session, calcTile, isCorrect, resultTile?.answer ?? null);
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
  if (adaptiveHintTimer) clearTimeout(adaptiveHintTimer);
  const summary = finishSession(session);
  summary.missionKind = currentMissionKind;
  const profileBefore = await loadProfile(childId);
  const currentDifficultyLevels = profileBefore.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  const nextDifficultyLevels = adjustDifficultyLevels(currentDifficultyLevels, summary.breakdown);
  const progressionResult = applyProgression(profileBefore, summary, nextDifficultyLevels);
  const dailyChallenge = applyDailyChallenge(profileBefore, summary);
  const weeklyGoal = applyWeeklyGoal(profileBefore, summary);
  const previousWeeklyProgress = profileBefore.weeklyGoalWeekStart === weeklyGoal.weeklyGoalWeekStart ? profileBefore.weeklyGoalProgress ?? 0 : 0;
  const justCompletedWeeklyGoal = weeklyGoal.weeklyGoalTarget > 0 && previousWeeklyProgress < weeklyGoal.weeklyGoalTarget && weeklyGoal.weeklyGoalProgress >= weeklyGoal.weeklyGoalTarget;
  const dailyChallengeCompletions = (profileBefore.dailyChallengeCompletions ?? 0) + (dailyChallenge.justCompletedDailyChallenge ? 1 : 0);
  const weeklyGoalCompletions = (profileBefore.weeklyGoalCompletions ?? 0) + (justCompletedWeeklyGoal ? 1 : 0);
  const previousDailyMissionCount = profileBefore.dailyMissionCountDate === summary.date ? profileBefore.dailyMissionCount ?? 0 : 0;
  const dailyMissionCount = previousDailyMissionCount + 1;
  const chestReward = claimDailyAdventureChest(profileBefore, { date: summary.date, completedMissions: dailyMissionCount });
  const rareTreasureIds = chestReward.success ? chestReward.rareTreasureIds : profileBefore.rareTreasureIds ?? [];
  let subjectMissionCounts = { ...(profileBefore.subjectMissionCounts ?? {}) };
  Object.entries(summary.breakdown).forEach(([type, stats]) => {
    if (stats.total > 0 && subjectForId(type)) subjectMissionCounts = subjectMissionCountsAfter(subjectMissionCounts, type);
  });
  const subjectBadges = newlyEarnedSubjectBadges(subjectMissionCounts, progressionResult.badges);
  const challengeBadges = newlyEarnedChallengeBadges(
    { dailyChallengeCompletions, weeklyGoalCompletions, rareTreasureCount: rareTreasureIds.length },
    progressionResult.badges,
    {
      dailyChallengeCompletions: dailyChallenge.justCompletedDailyChallenge,
      weeklyGoalCompletions: justCompletedWeeklyGoal,
      rareTreasureCount: !!chestReward.treasure,
    }
  );
  const additionalBadges = [...subjectBadges, ...challengeBadges];
  const newBadges = [...progressionResult.newBadges, ...additionalBadges];
  const badges = [...new Set([...progressionResult.badges, ...additionalBadges])];
  const badgeCounts = badgeCountsAfterAwards(progressionResult.badgeCounts, progressionResult.badges, additionalBadges);
  const badgeDates = { ...progressionResult.badgeDates };
  additionalBadges.forEach((id) => { badgeDates[id] = summary.date; });
  const finalXp = progressionResult.xp + dailyChallenge.bonusXp;
  const themeBonus = currentMissionKind === 'weekly-theme' ? 5 : 0;
  const activeSeason = seasonForDate(new Date(`${summary.date}T12:00:00`));
  const previousSeasonalCount = profileBefore.seasonalMissionCounts?.[activeSeason] ?? 0;
  const nextSeasonalCount = previousSeasonalCount + 1;
  const seasonalBonus = previousSeasonalCount < 8 && nextSeasonalCount >= 8 ? 25 : 0;
  const finalCoins = progressionResult.coins + dailyChallenge.bonusCoins + (chestReward.success ? chestReward.bonusCoins : 0) + themeBonus + seasonalBonus;
  const rewardBreakdown = { ...coinRewardBreakdown(
    summary.correctCount,
    summary.correctCount === summary.questionsTotal,
    dailyChallenge.justCompletedDailyChallenge
  ), chestBonus: chestReward.success ? chestReward.bonusCoins : 0, themeBonus, seasonalBonus };
  const finalAvatarLevel = levelForXp(finalXp);
  const finalLeveledUp = finalAvatarLevel > profileBefore.avatarLevel;
  const nextProfile = {
    ...profileBefore,
    xp: finalXp,
    avatarLevel: finalAvatarLevel,
    streakDays: progressionResult.streakDays,
    badges,
    badgeDates,
    badgeCounts,
    perfectMissionsCount: progressionResult.perfectMissionsCount,
    totalCorrectCount: progressionResult.totalCorrectCount,
    coins: finalCoins,
    dailyChallengeDate: dailyChallenge.dailyChallengeDate,
    dailyChallengeProgress: dailyChallenge.dailyChallengeProgress,
    dailyChallengeCompleted: dailyChallenge.dailyChallengeCompleted,
    weeklyGoalWeekStart: weeklyGoal.weeklyGoalWeekStart,
    weeklyGoalProgress: weeklyGoal.weeklyGoalProgress,
    weeklyGoalTarget: weeklyGoal.weeklyGoalTarget,
    dailyChallengeCompletions,
    weeklyGoalCompletions,
    dailyMissionCountDate: summary.date,
    dailyMissionCount,
    dailyChestDate: chestReward.success ? chestReward.dailyChestDate : profileBefore.dailyChestDate ?? null,
    dailyChestCount: chestReward.success ? chestReward.dailyChestCount : profileBefore.dailyChestCount ?? 0,
    rareTreasureIds,
    mistakeNotebook: updateLearningNotebook(profileBefore.mistakeNotebook ?? [], summary.answeredQuestions, summary.date),
    learningStats: Object.entries(summary.breakdown).reduce((stats, [type, current]) => {
      const previous = stats[type] ?? { correct: 0, total: 0, successDates: [] };
      const successDates = new Set(previous.successDates ?? []);
      if (current.correct > 0) successDates.add(summary.date);
      stats[type] = { correct: previous.correct + current.correct, total: previous.total + current.total, successDates: [...successDates].slice(-30) };
      return stats;
    }, { ...(profileBefore.learningStats ?? {}) }),
    learningRecaps: currentMissionKind === 'learning' && currentLearningLesson
      ? scheduleLearningRecap(profileBefore.learningRecaps ?? [], currentLearningLesson, summary.date)
      : profileBefore.learningRecaps ?? [],
    learnedLessons: currentMissionKind === 'learning' && currentLearningLesson
      ? learnedLessonsAfterLesson(profileBefore.learnedLessons ?? [], currentLearningLesson, summary.date, summary.incorrectQuestions.length)
      : profileBefore.learnedLessons ?? [],
    diagnosticCompletedForLevel: currentMissionKind === 'diagnostic' ? profileBefore.schoolLevel ?? 'CE2' : profileBefore.diagnosticCompletedForLevel ?? null,
    diagnosticPercent: currentMissionKind === 'diagnostic' ? Math.round((summary.correctCount / summary.questionsTotal) * 100) : profileBefore.diagnosticPercent ?? null,
    diagnosticDate: currentMissionKind === 'diagnostic' ? summary.date : profileBefore.diagnosticDate ?? null,
    subjectMissionCounts,
    storyProgress: storyProgressAfterMission(profileBefore),
    seasonalMissionCounts: {
      ...(profileBefore.seasonalMissionCounts ?? {}),
      [activeSeason]: nextSeasonalCount,
    },
    assignedSubject: profileBefore.assignedSubject === summary.subject ? null : profileBefore.assignedSubject ?? null,
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
    if (finalLeveledUp || newBadges.length > 0) {
      setTimeout(playLevelUpSound, 550);
    }
  }
  pairsRound = null;
  currentLearningLesson = null;
  renderResults(root, {
    correctCount: summary.correctCount,
    questionsTotal: summary.questionsTotal,
    gainedXp: finalXp - profileBefore.xp,
    gainedCoins: finalCoins - (profileBefore.coins ?? 0),
    coinBreakdown: rewardBreakdown,
    coinGoal: nextCoinPurchaseGoal({ ...nextProfile, coins: finalCoins }, avatarPackSettings),
    leveledUp: finalLeveledUp,
    newBadges,
    badgeCounts,
    justCompletedDailyChallenge: dailyChallenge.justCompletedDailyChallenge,
    justCompletedWeeklyGoal,
    dailyChestReward: chestReward.success ? chestReward : null,
    companionId: profileBefore.selectedCompanion ?? DEFAULT_COMPANION,
    weeklyRewardText: profileBefore.weeklyRewardText,
    breakdown: summary.breakdown,
    incorrectQuestions: summary.incorrectQuestions,
    onRetryMistakes: null,
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
  window.addEventListener('online', () => { if (childId && lastProfile) showHome(); });
  window.addEventListener('offline', () => { if (lastProfile) renderHomeScreen(lastProfile); });
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
