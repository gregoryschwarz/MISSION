import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../shared/firebaseConfig.js';
import { getStoredFamilyId, storeFamilyId, pairWithFamily } from './pairing.js';
import { generateMission, generateSingleTypeMission, QUESTION_TYPES } from './questions.js';
import { createSession, currentQuestion, submitAnswer, recordAnswer, isSessionComplete, finishSession } from './session.js';
import { applyProgression } from '../shared/progression.js';
import { enqueueSession, flushQueue } from '../shared/syncQueue.js';
import { renderPairing, renderHome, renderNotionPicker, renderCustomize, renderQuestion, renderQuestionQcm, renderPairsRound, renderResults, renderConnectionError } from './ui.js';
import { isSoundEnabled, setSoundEnabled, playCorrectSound, playIncorrectSound, playMissionCompleteSound, playLevelUpSound } from './sound.js';
import { auraClassForLevel } from './avatar.js';
import { adjustDifficultyLevels, DEFAULT_DIFFICULTY_LEVELS } from '../shared/difficulty.js';
import { pickMissionMode, getLastMissionMode, storeLastMissionMode } from './missionMode.js';
import { generateChoices } from './choices.js';
import { createPairsRound, attemptMatch, isPairsRoundComplete } from './pairsGame.js';
import {
  characterMedallionData,
  accessoryMedallionData,
  emojiForCharacter,
  emojiForAccessory,
  DEFAULT_CHARACTER,
  DEFAULT_ACCESSORY,
} from '../shared/avatarCustomization.js';

const root = document.getElementById('app');
const MISSION_LENGTH = 10;
const PAUSE_REMINDER_MS = 15 * 60 * 1000;

let familyId = getStoredFamilyId();
let session = null;
let missionMode = 'quiz';
let pairsRound = null;
let lastFeedback = null;
let soundEnabled = isSoundEnabled();
let lastProfile = null;
let helpVisible = false;
let cachedChoices = null;
let cachedChoicesIndex = -1;

async function ensureAuth() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}

async function writeSession(targetFamilyId, summary) {
  await addDoc(collection(db, 'families', targetFamilyId, 'sessions'), {
    ...summary,
    timestamp: serverTimestamp(),
  });
}

async function loadProfile(targetFamilyId) {
  const ref = doc(db, 'families', targetFamilyId, 'profile', 'data');
  const snapshot = await getDoc(ref);
  return snapshot.exists()
    ? snapshot.data()
    : {
        xp: 0,
        avatarLevel: 1,
        badges: [],
        streakDays: 0,
        lastSessionDate: null,
        difficultyLevels: DEFAULT_DIFFICULTY_LEVELS,
        perfectMissionsCount: 0,
        selectedCharacter: DEFAULT_CHARACTER,
        selectedAccessory: DEFAULT_ACCESSORY,
      };
}

async function saveProfile(targetFamilyId, profile) {
  const ref = doc(db, 'families', targetFamilyId, 'profile', 'data');
  await setDoc(ref, profile);
}

function renderHomeScreen(profile) {
  renderHome(root, {
    childName: profile.childName,
    avatarLevel: profile.avatarLevel,
    badges: profile.badges,
    auraClass: auraClassForLevel(profile.avatarLevel),
    characterEmoji: emojiForCharacter(profile.selectedCharacter ?? DEFAULT_CHARACTER),
    accessoryEmoji: emojiForAccessory(profile.selectedAccessory ?? DEFAULT_ACCESSORY),
    soundEnabled,
    focusType: profile.focusType ?? null,
    onStartMission: () => startMission(),
    onToggleSound: toggleSound,
    onCustomize: showCustomize,
    onChooseNotion: showNotionPicker,
  });
}

function showNotionPicker() {
  renderNotionPicker(root, {
    types: QUESTION_TYPES,
    onSelect: startMission,
    onBack: () => renderHomeScreen(lastProfile),
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
    characters: characterMedallionData(profile.avatarLevel),
    accessories: accessoryMedallionData(profile.badges),
    selectedCharacterId: profile.selectedCharacter ?? DEFAULT_CHARACTER,
    selectedAccessoryId: profile.selectedAccessory ?? DEFAULT_ACCESSORY,
    onSelectCharacter: handleSelectCharacter,
    onSelectAccessory: handleSelectAccessory,
    onBack: () => renderHomeScreen(lastProfile),
  });
}

async function handleSelectCharacter(characterId) {
  const nextProfile = { ...lastProfile, selectedCharacter: characterId };
  lastProfile = nextProfile;
  await saveProfile(familyId, nextProfile).catch(() => {});
  showCustomize();
}

async function handleSelectAccessory(accessoryId) {
  const nextProfile = { ...lastProfile, selectedAccessory: accessoryId };
  lastProfile = nextProfile;
  await saveProfile(familyId, nextProfile).catch(() => {});
  showCustomize();
}

async function showHome() {
  try {
    await ensureAuth();
    const profile = await loadProfile(familyId);
    lastProfile = profile;
    renderHomeScreen(profile);
    flushQueue((summary) => writeSession(familyId, summary)).catch(() => {});
  } catch (err) {
    renderConnectionError(root, { onRetry: showHome });
  }
}

function startMission(notionType = null) {
  const difficultyLevels = lastProfile?.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  missionMode = pickMissionMode(getLastMissionMode());
  storeLastMissionMode(missionMode);
  const questions = notionType
    ? generateSingleTypeMission(MISSION_LENGTH, notionType, difficultyLevels[notionType] ?? 1)
    : generateMission(MISSION_LENGTH, difficultyLevels, lastProfile?.focusType ?? null);
  session = createSession(questions);
  lastFeedback = null;
  helpVisible = false;
  cachedChoicesIndex = -1;
  if (missionMode === 'pairs') {
    pairsRound = createPairsRound(session.questions);
    showPairsRound();
  } else {
    showQuestion();
  }
}

function choicesForCurrentQuestion(question) {
  if (cachedChoicesIndex !== session.index) {
    cachedChoices = generateChoices(question);
    cachedChoicesIndex = session.index;
  }
  return cachedChoices;
}

function showQuestion() {
  const question = currentQuestion(session);
  const elapsedMs = Date.now() - session.startedAt;
  const showPauseReminder = elapsedMs >= PAUSE_REMINDER_MS;
  if (missionMode === 'qcm') {
    renderQuestionQcm(root, {
      question,
      choices: choicesForCurrentQuestion(question),
      index: session.index,
      total: session.questions.length,
      feedback: lastFeedback,
      showPauseReminder,
      onAnswer: handleAnswer,
      showHelp: helpVisible,
      onOpenHelp: openHelp,
      onCloseHelp: closeHelp,
    });
  } else {
    renderQuestion(root, {
      question,
      index: session.index,
      total: session.questions.length,
      feedback: lastFeedback,
      showPauseReminder,
      onAnswer: handleAnswer,
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
  const isCorrect = submitAnswer(session, answer);
  lastFeedback = isCorrect ? 'correct' : 'incorrect';
  if (soundEnabled) {
    isCorrect ? playCorrectSound() : playIncorrectSound();
  }
  if (isSessionComplete(session)) {
    await finishMission();
  } else {
    showQuestion();
  }
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
  const profileBefore = await loadProfile(familyId);
  const currentDifficultyLevels = profileBefore.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  const nextDifficultyLevels = adjustDifficultyLevels(currentDifficultyLevels, summary.breakdown);
  const progressionResult = applyProgression(profileBefore, summary, nextDifficultyLevels);
  const nextProfile = {
    ...profileBefore,
    xp: progressionResult.xp,
    avatarLevel: progressionResult.avatarLevel,
    streakDays: progressionResult.streakDays,
    badges: progressionResult.badges,
    perfectMissionsCount: progressionResult.perfectMissionsCount,
    lastSessionDate: progressionResult.lastSessionDate,
    difficultyLevels: nextDifficultyLevels,
  };
  await saveProfile(familyId, nextProfile).catch(() => {});
  try {
    await writeSession(familyId, summary);
  } catch (err) {
    enqueueSession(summary);
  }
  if (soundEnabled) {
    playMissionCompleteSound();
    if (progressionResult.leveledUp || progressionResult.newBadges.length > 0) {
      setTimeout(playLevelUpSound, 550);
    }
  }
  pairsRound = null;
  renderResults(root, {
    correctCount: summary.correctCount,
    questionsTotal: summary.questionsTotal,
    gainedXp: progressionResult.xp - profileBefore.xp,
    leveledUp: progressionResult.leveledUp,
    newBadges: progressionResult.newBadges,
    onContinue: showHome,
  });
}

async function handlePairing({ familyId: candidateId, pin }) {
  let result;
  try {
    await ensureAuth();
    result = await pairWithFamily(db, candidateId, pin);
  } catch (err) {
    renderPairing(root, {
      onSubmit: handlePairing,
      error: 'Connexion impossible. Vérifie le Wi-Fi et réessaie.',
    });
    return;
  }
  if (result.success) {
    storeFamilyId(candidateId);
    familyId = candidateId;
    showHome();
  } else {
    const message = result.reason === 'wrong-pin' ? 'Code secret incorrect.' : "Code d'appairage inconnu.";
    renderPairing(root, { onSubmit: handlePairing, error: message });
  }
}

function start() {
  if (familyId) {
    showHome();
  } else {
    renderPairing(root, { onSubmit: handlePairing });
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}

start();
