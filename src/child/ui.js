import { emojiForType, renderBadgeMedallionsHtml, badgeCollectionData, BADGE_CATEGORIES, BADGES } from '../shared/badges.js';
import { HELP_TEXT, helpTextForType } from '../shared/helpContent.js';
import { DIFFICULTY_LABELS } from '../shared/difficulty.js';
import { dynamicHintSteps } from './hints.js';
import { shapeSvg } from './shapes.js';
import { coinSvg, formatEuroCents, parseEuroInput } from './money.js';
import { lengthBarSvg } from './length.js';
import { clockFaceSvg } from './clock.js';
import {
  visualForCharacter,
  visualForHairstyle,
  visualForOutfit,
  companionForId,
  companionAccessoryForId,
  HATS,
  CAPES,
} from '../shared/avatarCustomization.js';

function blockAvatarHtml(characterId, hatId = 'none-hat', capeId = 'none-cape', compact = false, hairstyleId = 'original-hair', outfitId = 'original-outfit', companionId = 'none-companion', companionAccessoryId = 'none-pet-accessory') {
  const visual = visualForCharacter(characterId);
  const hairstyle = visualForHairstyle(hairstyleId);
  const outfit = visualForOutfit(outfitId);
  const companion = companionForId(companionId);
  const companionAccessory = companionAccessoryForId(companionAccessoryId);
  const safeHat = HATS.some((item) => item.id === hatId) ? hatId : 'none-hat';
  const safeCape = CAPES.some((item) => item.id === capeId) ? capeId : 'none-cape';
  const hairColor = hairstyle.color ?? visual.hair;
  const outfitColor = outfit.outfit ?? visual.outfit;
  const accentColor = outfit.accent ?? visual.accent;
  const outfitEmblem = outfit.id === 'original-outfit' ? '' : outfit.emoji;
  const companionHtml = !compact && companion.emoji
    ? `<span class="avatar-companion companion-${companion.id}" aria-label="${companion.name}"><span class="companion-emoji">${companion.emoji}</span>${companionAccessory.emoji ? `<span class="companion-accessory accessory-${companionAccessory.id}">${companionAccessory.emoji}</span>` : ''}</span>`
    : '';
  return `<div class="block-avatar ${compact ? 'block-avatar-compact' : ''} character-${visual.id} hair-${hairstyle.id} outfit-${outfit.id} hat-${safeHat} cape-${safeCape}" style="--avatar-skin:${visual.skin};--avatar-hair:${hairColor};--avatar-outfit:${outfitColor};--avatar-accent:${accentColor}" role="img" aria-label="${visual.name}">
    <span class="block-cape"></span><span class="block-body"><span class="block-outfit-emblem">${outfitEmblem}</span></span><span class="block-arm block-arm-left"></span><span class="block-arm block-arm-right"></span>
    <span class="block-head"><span class="block-hair"></span><span class="block-eye block-eye-left"></span><span class="block-eye block-eye-right"></span><span class="block-smile"></span></span>
    <span class="block-hat"></span><span class="block-leg block-leg-left"></span><span class="block-leg block-leg-right"></span>
    ${companionHtml}
  </div>`;
}

const DECOR_SCENES = {
  menthe: ['🌿', '🌼', '🍀'], creme: ['☁️', '✨', '🌾'], soleil: ['☀️', '🌻', '✨'], corail: ['🪸', '🐚', '🌊'],
  foret: ['🌲', '🍄', '🌳'], bonbon: ['🍭', '☁️', '🍬'], 'arc-en-ciel': ['🌈', '☁️', '⭐'], 'nuit-etoilee': ['🌙', '⭐', '✨'],
  'haunted-manor': ['🏚️', '🦇', '🌕'], 'pumpkin-night': ['🎃', '🌙', '🍂'], 'snow-village': ['🏠', '❄️', '🎄'], 'aurora-sky': ['✨', '🏔️', '🌌'],
  'block-city': ['🏙️', '🧊', '🔷'], 'neon-arcade': ['🕹️', '⚡', '💠'], 'mystic-stage': ['🎤', '✨', '🎵'], 'moon-concert': ['🌙', '🎶', '⭐'],
  'enchanted-grove': ['🌳', '🧚', '🍄'], 'candy-clouds': ['☁️', '🍬', '🌈'], 'crystal-cave': ['💎', '✨', '🔮'],
  'ocean-lagoon': ['🌴', '🌊', '🐚'], 'zen-garden': ['🎋', '🪨', '🌸'], 'sunset-beach': ['🌅', '🌴', '🌊'],
  'fairy-village':['🏡','🧚','🌸'], 'magic-waterfall':['🌿','💦','✨'], 'royal-stable':['🏠','🐴','🌾'], 'horse-meadow':['🌳','🐎','🌼'],
  'prehistoric-jungle':['🌴','🦕','🌋'], 'fossil-museum':['🏛️','🦴','🔎'], 'magic-kitchen':['🧁','✨','🍰'], 'cake-shop':['🏠','🍭','🎂'],
  'underwater-palace':['🏰','🐠','🐚'], 'coral-reef':['🪸','🐟','🌊'], 'ferris-wheel':['🎡','🎈','✨'], 'fairground-arcade':['🕹️','🎟️','💡'],
  'festival-stage':['🎤','🎵','🎸'], backstage:['🎹','⭐','🎧'], 'mystery-manor':['🏚️','🔍','🌙'], 'secret-lab':['🧪','⚗️','🔐'],
  'forest-camp':['⛺','🌲','🔥'], 'starry-tent':['⛺','⭐','🌙'], 'cloud-castle':['🏰','☁️','🌈'], 'giant-moon':['☁️','🌙','⭐'],
  'flower-garden':['🌷','🐝','🌸'], 'magic-greenhouse':['🏡','🌿','🦋'], 'summer-pool':['🏊','☀️','🍹'], 'tropical-island':['🌴','☀️','🌊'],
  'magic-school':['🏫','✨','🪄'], 'enchanted-library':['📚','🕯️','🦉'], 'birthday-room':['🎂','🎈','🎁'], 'surprise-party':['🥳','🎉','🎊'],
  'champion-stadium':['🏟️','⚽','🏆'], 'golden-podium':['🥇','🏆','✨'],
};

function decorSceneHtml(decorId) {
  const scene = DECOR_SCENES[decorId] ?? DECOR_SCENES.menthe;
  return `<div class="decor-landscape" aria-hidden="true">
    <span class="decor-object decor-object-left">${scene[0]}</span>
    <span class="decor-object decor-object-sky">${scene[1]}</span>
    <span class="decor-object decor-object-right">${scene[2]}</span>
    <span class="decor-ground"></span>
  </div>`;
}

function coinGoalHtml(goal, compact = false, actionable = false) {
  if (!goal) return '';
  const progress = goal.cost > 0 ? Math.min(100, Math.round(((goal.cost - goal.remaining) / goal.cost) * 100)) : 100;
  const tag = actionable ? 'button' : 'div';
  return `<${tag} ${actionable ? 'type="button" id="coin-goal-action"' : ''} class="coin-goal ${goal.affordable ? 'coin-goal-ready' : ''} ${compact ? 'coin-goal-compact' : ''} ${actionable ? 'coin-goal-action' : ''}">
    <div class="coin-goal-copy"><span>${goal.affordable ? '🎉 ACHAT DISPONIBLE' : '🎯 PROCHAIN OBJECTIF'}</span><strong>${goal.emoji} ${escapeHtml(goal.name)}</strong></div>
    <div class="coin-goal-progress"><div style="width:${progress}%"></div></div>
    <small>${goal.affordable ? `Tu as les ${goal.cost} pièces nécessaires — acheter maintenant ›` : `Encore ${goal.remaining} pièce${goal.remaining > 1 ? 's' : ''} sur ${goal.cost} — voir la boutique ›`}</small>
  </${tag}>`;
}

function dailyAdventureHtml(adventure = { progress: 0, target: 3, completed: false, chestClaimed: false }) {
  const steps = Array.from({ length: adventure.target }, (_, index) => {
    const number = index + 1;
    const state = number <= adventure.progress ? 'complete' : number === adventure.progress + 1 ? 'current' : 'locked';
    return `<div class="adventure-step ${state}"><span>${state === 'complete' ? '✓' : number}</span><small>Mission ${number}</small></div>`;
  }).join('<i class="adventure-path-line"></i>');
  return `<section class="daily-adventure ${adventure.completed ? 'completed' : ''}">
    <div class="daily-adventure-heading"><div><p>AVENTURE DU JOUR</p><h3>🗺️ La route vers le coffre</h3></div><strong>${adventure.progress}/${adventure.target}</strong></div>
    <div class="daily-adventure-path">${steps}<i class="adventure-path-line"></i><div class="adventure-chest ${adventure.chestClaimed ? 'claimed' : adventure.completed ? 'ready' : 'locked'}"><span>${adventure.chestClaimed ? '✨' : adventure.completed ? '🎁' : '🔒'}</span><small>${adventure.chestClaimed ? 'Ouvert' : 'Coffre'}</small></div></div>
  </section>`;
}

function companionMessageHtml(companionId, { adventure, coinGoal, streakDays }) {
  const companion = companionForId(companionId);
  if (!companion.emoji) return '';
  const message = coinGoal?.affordable
    ? `On peut débloquer ${coinGoal.name} !`
    : adventure?.completed
      ? 'Bravo, le coffre du jour est à toi !'
      : adventure?.progress > 0
        ? `Encore ${adventure.target - adventure.progress} mission${adventure.target - adventure.progress > 1 ? 's' : ''} avant le coffre !`
        : streakDays > 1
          ? `Notre série de ${streakDays} jours continue !`
          : 'Je suis prêt pour notre prochaine aventure !';
  return `<aside class="companion-message" aria-live="polite"><span>${companion.emoji}</span><div><strong>${escapeHtml(companion.name)}</strong><p>${escapeHtml(message)}</p></div></aside>`;
}

// Navigation par onglets persistante, affichée uniquement sur les 4 écrans
// "hub" (accueil, défis, avatar, récompenses) — absente pendant une mission
// active pour ne pas distraire l'enfant en plein exercice.
const BOTTOM_TABS = [
  { id: 'missions', emoji: '🏠', label: 'Missions' },
  { id: 'defis', emoji: '🎯', label: 'Défis' },
  { id: 'avatar', emoji: '🎨', label: 'Avatar' },
  { id: 'recompenses', emoji: '🎁', label: 'Récompenses' },
];

function bottomTabsHtml(activeTab) {
  return `
    <nav class="bottom-tabs">
      ${BOTTOM_TABS.map(
        (t) => `
        <button class="bottom-tab ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}">
          <span class="bottom-tab-icon">${t.emoji}</span>
          <span class="bottom-tab-label">${t.label}</span>
        </button>`
      ).join('')}
    </nav>
  `;
}

function attachBottomTabs(root, onNavigate) {
  if (!onNavigate) return;
  root.querySelectorAll('.bottom-tab').forEach((btn) =>
    btn.addEventListener('click', () => onNavigate(btn.dataset.tab))
  );
}

function moneyDisplayHtml(items) {
  return `<div class="money-display">${items.map((id) => coinSvg(id)).join('')}</div>`;
}

function lengthDisplayHtml(a, b) {
  return `<div class="length-display">
    <div class="length-bar-row">${lengthBarSvg(a)}<span>${a} cm</span></div>
    <div class="length-bar-row">${lengthBarSvg(b)}<span>${b} cm</span></div>
  </div>`;
}

function clockDisplayHtml(hour12, minute) {
  return `<div class="clock-display">${clockFaceSvg(hour12, minute)}</div>`;
}

function visualDisplayHtml(q) {
  if (q.shape) return `<div class="shape-display">${shapeSvg(q.shape)}</div>`;
  if (q.items) return moneyDisplayHtml(q.items);
  if (q.type === 'longueur') return lengthDisplayHtml(q.a, q.b);
  if (q.type === 'temps') return clockDisplayHtml(q.hour12, q.minute);
  return '';
}

function answerLabel(question, choice) {
  if (question.type === 'monnaie') return formatEuroCents(choice);
  if (choice === '>') return 'supérieur &gt;';
  if (choice === '<') return 'inférieur &lt;';
  return choice;
}

function missionProgressHtml(index, total) {
  const current = index + 1;
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  return `
    <div class="mission-progress" role="progressbar" aria-label="Progression de la mission" aria-valuenow="${current}" aria-valuemin="1" aria-valuemax="${total}">
      <div class="mission-progress-label"><span>Mission en cours</span><strong>${current} / ${total}</strong></div>
      <div class="mission-progress-track"><span style="width:${percent}%"></span></div>
    </div>`;
}

function answerChoiceClass(question, choice, selectedAnswer, feedback) {
  if (!feedback) return '';
  if (choice === question.answer) return 'answer-correct';
  if (choice === selectedAnswer) return 'answer-incorrect';
  return 'answer-muted';
}

function answerReviewHtml(question, feedback, index, total) {
  if (!feedback) return '';
  const isCorrect = feedback === 'correct';
  const correctLabel = answerLabel(question, question.answer);
  return `
    <div class="answer-review answer-review-${feedback}" role="status" aria-live="polite">
      <strong>${isCorrect ? '🌟 Bravo, bonne réponse !' : '🤔 Presque !'}</strong>
      ${isCorrect ? '' : `<span>La bonne réponse était <b>${correctLabel}</b>.</span>`}
      <button id="next-question" type="button" class="big-button">
        ${index + 1 >= total ? 'Voir mes résultats' : 'Question suivante'} →
      </button>
    </div>`;
}

export function renderPairing(root, { onSubmit, error }) {
  root.innerHTML = `
    <div class="screen pairing-screen">
      <h1>🦄 Missions d'Ambre</h1>
      <p>Entre le code affiché dans l'espace parent. Ton parent devra ensuite autoriser cette tablette.</p>
      <form id="pairing-form">
        <label>Code d'appairage<input id="child-id" type="text" inputmode="text" autocomplete="off" maxlength="6" placeholder="M7K4QP" required /></label>
        ${error ? '<p class="error" id="pairing-error"></p>' : ''}
        <button type="submit" class="big-button">Demander l'autorisation</button>
      </form>
    </div>
  `;
  if (error) {
    root.querySelector('#pairing-error').textContent = error;
  }
  root.querySelector('#pairing-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const childId = root.querySelector('#child-id').value.trim();
    onSubmit({ childId });
  });
}

export function renderPairingPending(root, { onRetry, onCancel, error = null }) {
  root.innerHTML = `
    <div class="screen pairing-screen">
      <h1>⏳ Autorisation en attente</h1>
      <p>Demande à ton parent d'ouvrir son espace puis d'autoriser cette tablette.</p>
      <p class="setup-hint">La vérification est automatique, tu peux laisser cet écran ouvert.</p>
      ${error ? '<p class="error" id="pairing-error"></p>' : ''}
      <button id="pairing-retry" class="big-button">Vérifier maintenant</button>
      <button id="pairing-cancel" class="link-button">Changer de code</button>
    </div>
  `;
  if (error) root.querySelector('#pairing-error').textContent = error;
  root.querySelector('#pairing-retry').addEventListener('click', onRetry);
  root.querySelector('#pairing-cancel').addEventListener('click', onCancel);
}

export function renderNotionPicker(root, { types, difficultyLevels = {}, onSelect, onBack, onNavigate }) {
  root.innerHTML = `
    <div class="screen notion-picker-screen with-tabs">
      <h1>Choisis une notion</h1>
      <div class="notion-grid">
        ${types
          .map((type, i) => {
            const level = difficultyLevels[type] ?? 1;
            return `
              <button class="notion-card theme-${type}" data-type="${type}" style="animation-delay:${i * 40}ms">
                <span class="notion-card-emoji">${emojiForType(type)}</span>
                <span class="notion-card-label">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                <span class="notion-card-level">${DIFFICULTY_LABELS[level] ?? DIFFICULTY_LABELS[1]}</span>
              </button>`;
          })
          .join('')}
      </div>
      <button id="notion-picker-back" class="big-button">Retour</button>
    </div>
    ${bottomTabsHtml('defis')}
  `;
  root.querySelectorAll('.notion-card').forEach((btn) =>
    btn.addEventListener('click', () => onSelect(btn.dataset.type))
  );
  root.querySelector('#notion-picker-back').addEventListener('click', onBack);
  attachBottomTabs(root, onNavigate);
}

const FOCUS_LABELS = {
  addition: "l'addition",
  soustraction: 'la soustraction',
  multiplication: 'la multiplication',
  comparaison: 'la comparaison',
  division: 'la division',
  fraction: 'les fractions',
  geometrie: 'la géométrie',
  monnaie: 'la monnaie',
  longueur: 'les longueurs',
  temps: "l'heure",
  probleme: 'les problèmes',
};

function statPillHtml(emoji, value, label) {
  return `<div class="stat-pill" title="${label}"><span>${emoji}</span><span>${value}</span></div>`;
}

const STREAK_BANNER_CONTENT = {
  'played-today': { className: 'streak-banner-success', text: (days) => `✅ Bravo, mission du jour faite ! Série de ${days} jour${days > 1 ? 's' : ''} 🔥 Reviens demain !` },
  'at-risk': { className: 'streak-banner-warning', text: (days) => `🔥 N'oublie pas de jouer aujourd'hui pour garder ta série de ${days} jour${days > 1 ? 's' : ''} !` },
  broken: { className: 'streak-banner-danger', text: () => '🔥 Commence une nouvelle série aujourd\'hui !' },
};

function streakBannerHtml(streakStatus, streakDays) {
  const content = STREAK_BANNER_CONTENT[streakStatus];
  if (!content) return '';
  return `<p class="streak-banner ${content.className}">${content.text(streakDays ?? 0)}</p>`;
}

function dailyChallengeCardHtml(progress, target, completed, onStartId) {
  if (completed) {
    return `
      <div class="daily-challenge-card daily-challenge-done">
        <p class="daily-challenge-title">🔥 Défi du jour relevé !</p>
        <p class="daily-challenge-subtitle">Reviens demain pour un nouveau défi ✅</p>
      </div>`;
  }
  const percent = target ? Math.round((progress / target) * 100) : 0;
  return `
    <div class="daily-challenge-card">
      <p class="daily-challenge-title">🔥 Défi du jour</p>
      <p class="daily-challenge-subtitle">Réussis ${target} exercices aujourd'hui</p>
      <div class="xp-bar daily-challenge-bar" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="${target}">
        <div class="xp-bar-fill" style="width:${percent}%"></div>
      </div>
      <p class="daily-challenge-progress-label">${progress}/${target}</p>
      <button id="${onStartId}" class="big-button">Continue tes missions !</button>
    </div>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function weeklyGoalCardHtml(progress, target, rewardText, rewardDays = []) {
  if (!target) return '';
  const completed = progress >= target;
  const remaining = Math.max(0, target - progress);
  const percent = Math.min(100, Math.round((progress / target) * 100));
  return `
    <div class="daily-challenge-card weekly-goal-card ${completed ? 'daily-challenge-done' : ''}">
      <p class="daily-challenge-title">🎯 Objectif de la semaine</p>
      <p class="daily-challenge-subtitle">${completed ? 'Objectif atteint, bravo ! 🎉' : `Plus que ${remaining} mission${remaining > 1 ? 's' : ''} pour débloquer ton bonus !`}</p>
      <div class="xp-bar daily-challenge-bar" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="${target}">
        <div class="xp-bar-fill" style="width:${percent}%"></div>
      </div>
      <p class="daily-challenge-progress-label">${Math.min(progress, target)}/${target} missions</p>
      ${rewardText ? `<div class="weekly-reward-unlocked ${completed ? '' : 'weekly-reward-locked'}"><span>${completed ? '🎁 RÉCOMPENSE DÉBLOQUÉE' : '🔒 TON BONUS DE LA SEMAINE'}</span><strong>${escapeHtml(rewardText)}</strong>${rewardDays.length ? `<em>${escapeHtml(rewardDays.join(' et '))}</em>` : ''}<small>${completed ? 'Gratuite — aucun paiement en pièces' : `Encore ${remaining} mission${remaining > 1 ? 's' : ''} et il est à toi !`}</small></div>` : ''}
    </div>`;
}

export function renderHome(root, { childName, avatarLevel, xpProgress, streakDays, streakStatus, totalCorrectCount, coins, coinGoal, priorityGoal, dailyAdventure, rareTreasures = [], dailyChallengeProgress, dailyChallengeCompleted, dailyChallengeTarget, weeklyGoalProgress, weeklyGoalTarget, weeklyRewardText, weeklyRewardDays, dailyMissionLimit, dailyMissionCount, badges, auraClass, characterId, hatId, capeId, hairstyleId, outfitId, companionId, companionAccessoryId, decorGradient, decorId, soundEnabled, focusType, onStartMission, onToggleSound, onCustomize, onChooseNotion, onStartFrenchMission, onShowRewards, onShowBadgeAlbum, onCoinGoalAction, onPriorityAction, onNavigate }) {
  const xpPercent = xpProgress ? Math.round((xpProgress.current / xpProgress.target) * 100) : 0;
  const mainGoal = priorityGoal ?? { kind: 'mission', emoji: '🗺️', label: 'Continuer mon aventure', detail: 'Une nouvelle mission m’attend', action: 'Jouer' };
  root.innerHTML = `
    <div class="screen home-screen with-tabs">
      <div class="home-header decor-scene decor-${decorId ?? 'menthe'}" style="background:${decorGradient ?? ''}">
        <button id="sound-toggle" class="sound-toggle" aria-label="Activer ou couper le son">${soundEnabled ? '🔊' : '🔇'}</button>
        <div class="home-avatar-stage">
          ${decorSceneHtml(decorId)}
          <div class="avatar-wrapper">
            <div class="avatar ${auraClass}">${blockAvatarHtml(characterId, hatId, capeId, false, hairstyleId, outfitId, companionId, companionAccessoryId)}</div>
          </div>
        </div>
        ${companionMessageHtml(companionId, { adventure: dailyAdventure, coinGoal, streakDays })}
        <h1><span id="child-name"></span><span class="home-level">Niveau ${avatarLevel}</span></h1>
        ${
          xpProgress
            ? `<div class="xp-bar" role="progressbar" aria-valuenow="${xpProgress.current}" aria-valuemin="0" aria-valuemax="${xpProgress.target}">
                <div class="xp-bar-fill" style="width:${xpPercent}%"></div>
              </div>
              <p class="xp-bar-label">${xpProgress.current}/${xpProgress.target} XP</p>`
            : ''
        }
        <div class="stat-pills">
          ${statPillHtml('🪙', coins ?? 0, 'Pièces')}
          ${statPillHtml('🔥', streakDays ?? 0, 'Série de jours')}
          ${statPillHtml('🏅', (badges ?? []).length, 'Badges')}
          ${statPillHtml('✅', totalCorrectCount ?? 0, 'Bonnes réponses')}
        </div>
        ${coinGoalHtml(coinGoal, true, true)}
      </div>
      <main class="home-content">
        ${streakBannerHtml(streakStatus, streakDays)}
        <div class="home-goals">
          ${dailyChallengeCardHtml(dailyChallengeProgress ?? 0, dailyChallengeTarget ?? 5, !!dailyChallengeCompleted, 'daily-challenge-start')}
          ${weeklyGoalCardHtml(weeklyGoalProgress ?? 0, weeklyGoalTarget ?? 0, weeklyRewardText, weeklyRewardDays)}
        </div>
        <div class="home-lower">
          <section class="home-progress-panel">
            <h2>🏆 Mes progrès</h2>
            <button type="button" id="priority-goal-action" class="priority-goal-card" data-kind="${mainGoal.kind}"><span>${mainGoal.emoji}</span><div><small>MON PROCHAIN OBJECTIF</small><strong>${escapeHtml(mainGoal.label)}</strong><p>${escapeHtml(mainGoal.detail)}</p></div><em>${mainGoal.action} ›</em></button>
            ${dailyAdventureHtml(dailyAdventure)}
            ${focusType ? `<p class="focus-banner">${emojiForType(focusType)} Aujourd'hui, on s'entraîne sur ${FOCUS_LABELS[focusType]} !</p>` : ''}
            ${rareTreasures.length ? `<div class="rare-treasure-shelf"><strong>✨ Mes trésors rares</strong><div>${rareTreasures.map((treasure) => `<span title="${escapeHtml(treasure.name)}">${treasure.emoji}<small>${escapeHtml(treasure.name)}</small></span>`).join('')}</div></div>` : ''}
            <div class="home-badges">${renderBadgeMedallionsHtml(badges)}</div>
          </section>
          <div class="home-actions" aria-label="Actions principales">
            <button id="start-mission" class="big-button home-primary-action">✨ Mission du jour</button>
            <button id="choose-notion" class="big-button">🎯 Choisir une notion</button>
            <button id="start-french-mission" class="big-button">📚 Mission Français</button>
            <button id="customize" class="big-button">🎨 Personnaliser</button>
            <button id="show-rewards" class="big-button">🎁 Récompenses</button>
            <button id="show-badges" class="big-button">🏅 Mes badges</button>
          </div>
        </div>
      </main>
    </div>
    ${bottomTabsHtml('missions')}
  `;
  root.querySelector('#child-name').textContent = childName ?? 'Ambre';
  root.querySelector('#start-mission').addEventListener('click', onStartMission);
  root.querySelector('#sound-toggle').addEventListener('click', onToggleSound);
  root.querySelector('#customize').addEventListener('click', onCustomize);
  root.querySelector('#choose-notion').addEventListener('click', onChooseNotion);
  root.querySelector('#start-french-mission').addEventListener('click', onStartFrenchMission);
  root.querySelector('#show-rewards').addEventListener('click', onShowRewards);
  root.querySelector('#show-badges').addEventListener('click', onShowBadgeAlbum);
  root.querySelector('#coin-goal-action')?.addEventListener('click', () => onCoinGoalAction?.());
  root.querySelector('#priority-goal-action')?.addEventListener('click', (event) => onPriorityAction?.(event.currentTarget.dataset.kind));
  root.querySelector('#daily-challenge-start')?.addEventListener('click', onStartMission);
  attachBottomTabs(root, onNavigate);
}

// `coins` n'est fourni que pour les catégories achetables (les personnages) :
// un médaillon verrouillé mais avec un coût affiche alors un bouton d'achat
// plutôt qu'un simple cadenas — cf. les maquettes ("🔒 80").
function customizeMedallionHtml(item, selectedId, coins = null) {
  const label = item.name ?? item.emoji ?? '';
  const characterName = item.skin ? label.split(' ') : [];
  const optionLabel = item.skin
    ? `<span class="customize-option-label character-option-name"><strong>${escapeHtml(characterName[0])}</strong><small>${escapeHtml(characterName.slice(1).join(' '))}</small></span>`
    : `<span class="customize-option-label">${escapeHtml(label)}</span>`;
  if (!item.unlocked) {
    if (coins !== null && item.cost > 0) {
      const affordable = coins >= item.cost;
      return `<button class="customize-option badge-medallion buyable ${affordable ? '' : 'unaffordable'}" data-id="${item.id}" data-cost="${item.cost}" title="${label} — ${item.cost} 🪙">
        <span class="medallion-lock">🔒</span>
        <span class="medallion-cost">${item.cost}🪙</span>${optionLabel}
      </button>`;
    }
    const unlockHint = item.unlockHint ?? (item.packId ? 'Disponible dans un pack' : item.requiredLevel ? `Atteindre le niveau ${item.requiredLevel}` : 'Objectif spécial');
    return `<div class="customize-option badge-medallion locked" title="${label} — ${unlockHint}"><span>🔒</span>${optionLabel}<small class="customize-unlock-hint">${unlockHint}</small></div>`;
  }
  const isSelected = item.id === selectedId;
  const isCape = CAPES.some((cape) => cape.id === item.id);
  const isHat = HATS.some((hat) => hat.id === item.id);
  const content = item.skin
    ? blockAvatarHtml(item.id, 'none-hat', 'none-cape', true)
    : isCape
      ? blockAvatarHtml('unicorn', 'none-hat', item.id, true)
      : isHat
        ? blockAvatarHtml('unicorn', item.id, 'none-cape', true)
        : (item.emoji ?? '🚫');
  return `<button class="customize-option badge-medallion selectable ${isSelected ? 'selected' : ''}" data-id="${item.id}" title="${label}"><span class="customize-option-visual">${content}</span>${optionLabel}${isSelected ? '<small>Équipé</small>' : ''}</button>`;
}

function customizeDecorSwatchHtml(decor, selectedId) {
  const gradient = `linear-gradient(160deg, ${decor.gradient.join(', ')})`;
  if (!decor.unlocked) {
    return `<div class="decor-swatch locked" title="${decor.name}" style="background:${gradient}"><span class="decor-lock">🔒</span><strong>${escapeHtml(decor.name)}</strong><small>${decor.packId ? 'Dans un pack' : `Niveau ${decor.requiredLevel}`}</small></div>`;
  }
  const isSelected = decor.id === selectedId;
  return `<button class="decor-swatch selectable ${isSelected ? 'selected' : ''}" data-id="${decor.id}" title="${decor.name}" style="background:${gradient}"><strong>${escapeHtml(decor.name)}</strong>${isSelected ? '<small>Équipé</small>' : ''}</button>`;
}

function customizeSectionHtml(id, title, emoji, items, selectedId, coins = null) {
  return `<section class="customize-category">
    <h2>${emoji} ${title}<small>${items.filter((item) => item.unlocked).length}/${items.length}</small></h2>
    <div class="customize-options" id="${id}">${items.map((item) => customizeMedallionHtml(item, selectedId, coins)).join('')}</div>
  </section>`;
}

function avatarPackHtml(pack, coins) {
  const affordable = coins >= pack.cost;
  const status = pack.owned
    ? '<span class="avatar-pack-status owned">✅ Acquis</span>'
    : !pack.levelUnlocked
      ? `<span class="avatar-pack-status locked">🔒 Niveau ${pack.requiredLevel}</span>`
      : `<button class="avatar-pack-buy" data-pack-id="${pack.id}" ${affordable ? '' : 'disabled'}>${affordable ? `Acheter · ${pack.cost} 🪙` : `Il manque ${pack.cost - coins} 🪙`}</button>`;
  const specialLabel = pack.seasonal ? 'COLLECTION SAISONNIÈRE' : pack.originalVariant ? 'CRÉATION ORIGINALE' : pack.decorPack ? 'PACK DE DÉCORS' : '';
  return `<article class="avatar-pack-card ${pack.owned ? 'owned' : ''} ${pack.seasonal ? 'seasonal' : ''} ${pack.originalVariant ? 'original-variant' : ''} ${pack.decorPack ? 'decor-pack' : ''}">
    ${specialLabel ? `<span class="avatar-pack-special">${specialLabel}</span>` : ''}
    <span class="avatar-pack-emoji">${pack.emoji}</span>
    <h3>${escapeHtml(pack.name)}</h3>
    <p>${escapeHtml(pack.description)}</p>
    <small>${pack.itemIds.length} éléments</small>
    ${status}
  </article>`;
}

export function renderCustomize(root, { characters, hats, capes, hairstyles, outfits, companions, companionAccessories, packs, decors, coins = 0, selectedCharacterId, selectedHatId, selectedCapeId, selectedHairstyleId, selectedOutfitId, selectedCompanionId, selectedCompanionAccessoryId, selectedDecorId, onSelectCharacter, onSelectHat, onSelectCape, onSelectHairstyle, onSelectOutfit, onSelectCompanion, onSelectCompanionAccessory, onSelectDecor, onPurchaseCharacter, onPurchasePack, onBack, onNavigate }) {
  const selectedCompanion = companions.find((item) => item.id === selectedCompanionId);
  const selectedDecor = decors.find((item) => item.id === selectedDecorId) ?? decors[0];
  const previewGradient = `linear-gradient(160deg, ${selectedDecor.gradient.join(', ')})`;
  root.innerHTML = `
    <div class="screen customize-screen with-tabs">
      <header class="customize-heading">
        <div><p class="customize-kicker">Mon univers</p><h1>🎨 Atelier d’Ambre</h1></div>
        <p class="coins-balance">🪙 ${coins} pièces</p>
      </header>
      <div class="customize-layout">
        <aside class="customize-preview-card">
          <div class="customize-preview decor-scene decor-${selectedDecor.id}" style="background:${previewGradient}">
            <span class="customize-preview-label">APERÇU</span>
            ${decorSceneHtml(selectedDecor.id)}
            <div class="customize-preview-stage">${blockAvatarHtml(selectedCharacterId, selectedHatId, selectedCapeId, false, selectedHairstyleId, selectedOutfitId, selectedCompanionId, selectedCompanionAccessoryId)}</div>
          </div>
          <div class="customize-preview-caption">
            <strong>${selectedCompanion?.emoji ? `${selectedCompanion.emoji} ${selectedCompanion.name}` : 'Ton avatar est prêt !'}</strong>
            <small>Choisis chaque élément pour créer ton style.</small>
          </div>
        </aside>
        <div class="customize-catalog">
          <section class="customize-category avatar-pack-shop">
            <div class="avatar-pack-heading"><div><span>NOUVEAU</span><h2>🛍️ Boutique de packs</h2></div><p>Monte de niveau, puis utilise tes pièces pour garder un pack pour toujours.</p></div>
            <div class="avatar-pack-grid">${packs.map((pack) => avatarPackHtml(pack, coins)).join('')}</div>
          </section>
          ${customizeSectionHtml('character-options', 'Personnages', '🙂', characters, selectedCharacterId, coins)}
          ${customizeSectionHtml('hairstyle-options', 'Coiffures', '💇', hairstyles, selectedHairstyleId)}
          ${customizeSectionHtml('outfit-options', 'Tenues', '👗', outfits, selectedOutfitId)}
          ${customizeSectionHtml('hat-options', 'Chapeaux et lunettes', '👑', hats, selectedHatId)}
          ${customizeSectionHtml('cape-options', 'Dos, ailes et capes', '🪽', capes, selectedCapeId)}
          ${customizeSectionHtml('companion-options', 'Compagnons', '🐾', companions, selectedCompanionId)}
          ${customizeSectionHtml('companion-accessory-options', 'Accessoires du compagnon', '🎀', companionAccessories, selectedCompanionAccessoryId)}
          <section class="customize-category">
            <h2>🌄 Décors <small>${decors.filter((item) => item.unlocked).length}/${decors.length}</small></h2>
            <div class="customize-options decor-options" id="decor-options">${decors.map((d) => customizeDecorSwatchHtml(d, selectedDecorId)).join('')}</div>
          </section>
        </div>
      </div>
      <button id="customize-back" class="big-button customize-back">Retour aux missions</button>
    </div>
    ${bottomTabsHtml('avatar')}
  `;
  root.querySelectorAll('#character-options .badge-medallion.selectable').forEach((btn) =>
    btn.addEventListener('click', () => onSelectCharacter(btn.dataset.id))
  );
  root.querySelectorAll('#character-options .badge-medallion.buyable:not(.unaffordable)').forEach((btn) =>
    btn.addEventListener('click', () => onPurchaseCharacter(btn.dataset.id, Number(btn.dataset.cost)))
  );
  root.querySelectorAll('.avatar-pack-buy:not([disabled])').forEach((btn) =>
    btn.addEventListener('click', () => onPurchasePack(btn.dataset.packId))
  );
  root.querySelectorAll('#hat-options .badge-medallion.selectable').forEach((btn) =>
    btn.addEventListener('click', () => onSelectHat(btn.dataset.id))
  );
  root.querySelectorAll('#cape-options .badge-medallion.selectable').forEach((btn) =>
    btn.addEventListener('click', () => onSelectCape(btn.dataset.id))
  );
  root.querySelectorAll('#hairstyle-options .badge-medallion.selectable').forEach((btn) =>
    btn.addEventListener('click', () => onSelectHairstyle(btn.dataset.id))
  );
  root.querySelectorAll('#outfit-options .badge-medallion.selectable').forEach((btn) =>
    btn.addEventListener('click', () => onSelectOutfit(btn.dataset.id))
  );
  root.querySelectorAll('#companion-options .badge-medallion.selectable').forEach((btn) =>
    btn.addEventListener('click', () => onSelectCompanion(btn.dataset.id))
  );
  root.querySelectorAll('#companion-accessory-options .badge-medallion.selectable').forEach((btn) =>
    btn.addEventListener('click', () => onSelectCompanionAccessory(btn.dataset.id))
  );
  root.querySelectorAll('#decor-options .decor-swatch.selectable').forEach((btn) =>
    btn.addEventListener('click', () => onSelectDecor(btn.dataset.id))
  );
  root.querySelector('#customize-back').addEventListener('click', onBack);
  attachBottomTabs(root, onNavigate);
}

function helpOverlayHtml(type, question) {
  if (type === null) {
    return `
      <div class="help-overlay">
        <div class="help-card">
          <h2>❓ Aide</h2>
          ${Object.keys(HELP_TEXT)
            .map(
              (t) => `
            <div class="help-entry">
              <h3>${emojiForType(t)} ${t}</h3>
              <p>${helpTextForType(t)}</p>
            </div>`
            )
            .join('')}
          <button id="help-close" class="big-button">Fermer</button>
        </div>
      </div>`;
  }
  const hintSteps = dynamicHintSteps(question);
  return `
    <div class="help-overlay">
      <div class="help-card">
        <h2>${emojiForType(type)} Aide</h2>
        <p>${helpTextForType(type)}</p>
        ${hintSteps ? `<ol class="help-steps">${hintSteps.map((s) => `<li>${s}</li>`).join('')}</ol>` : ''}
        <button id="help-close" class="big-button">Fermer</button>
      </div>
    </div>`;
}

export function renderQuestion(root, { question, index, total, onAnswer, onContinue, feedback, selectedAnswer, showPauseReminder, showHelp, onOpenHelp, onCloseHelp }) {
  const hasOptions = Array.isArray(question.options);
  const reviewing = !!feedback;
  root.innerHTML = `
    <div class="screen mission-screen">
      <button id="help-button" class="help-button" aria-label="Aide">❓</button>
      ${missionProgressHtml(index, total)}
      ${showPauseReminder ? '<p class="pause-reminder">🌸 Tu joues depuis un moment, une petite pause ?</p>' : ''}
      <section class="mission-card">
        <h2>${question.prompt}</h2>
        ${visualDisplayHtml(question)}
        ${hasOptions
          ? `<div class="options mission-options">
              ${question.options
                .map((choice) => {
                  const label = answerLabel(question, choice);
                  const stateClass = answerChoiceClass(question, choice, selectedAnswer, feedback);
                  return `<button class="big-button answer-btn ${stateClass}" data-value="${choice}" ${reviewing ? 'disabled' : ''}>${label}</button>`;
                })
                .join('')}
            </div>`
          : `<form id="answer-form" class="answer-form">
              <label class="answer-label" for="answer-input">Ta réponse</label>
              <input id="answer-input" type="${question.type === 'monnaie' ? 'text' : 'number'}" inputmode="${question.type === 'monnaie' ? 'decimal' : 'numeric'}" placeholder="${question.type === 'monnaie' ? '0,00 €' : 'Écris ta réponse'}" ${question.type === 'monnaie' ? 'aria-describedby="money-answer-hint"' : ''} ${reviewing ? `value="${escapeHtml(question.type === 'monnaie' ? formatEuroCents(selectedAnswer) : selectedAnswer)}" disabled` : ''} required />
              ${question.type === 'monnaie' ? '<small id="money-answer-hint" class="answer-hint">Tu peux écrire 7 ou 7,00 €</small>' : ''}
              ${reviewing ? '' : '<button type="submit" class="big-button">Valider ma réponse</button>'}
            </form>`}
        ${answerReviewHtml(question, feedback, index, total)}
      </section>
      ${showHelp ? helpOverlayHtml(question.type, question) : ''}
    </div>
  `;
  if (reviewing) {
    root.querySelector('#next-question').addEventListener('click', onContinue);
  } else if (hasOptions) {
    root.querySelectorAll('.answer-btn').forEach((btn) =>
      btn.addEventListener('click', () => onAnswer(btn.dataset.value))
    );
  } else {
    root.querySelector('#answer-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const raw = root.querySelector('#answer-input').value;
      const value = question.type === 'monnaie' ? parseEuroInput(raw) : Number(raw);
      if (value === null) return;
      onAnswer(value);
    });
  }
  root.querySelector('#help-button').addEventListener('click', onOpenHelp);
  if (showHelp) {
    root.querySelector('#help-close').addEventListener('click', onCloseHelp);
  }
}

export function renderQuestionQcm(root, { question, choices, index, total, onAnswer, onContinue, feedback, selectedAnswer, showPauseReminder, showHelp, onOpenHelp, onCloseHelp }) {
  const hasOptions = Array.isArray(question.options);
  const reviewing = !!feedback;
  root.innerHTML = `
    <div class="screen mission-screen">
      <button id="help-button" class="help-button" aria-label="Aide">❓</button>
      ${missionProgressHtml(index, total)}
      ${showPauseReminder ? '<p class="pause-reminder">🌸 Tu joues depuis un moment, une petite pause ?</p>' : ''}
      <section class="mission-card">
        <h2>${question.prompt}</h2>
        ${visualDisplayHtml(question)}
        <div class="options mission-options">
          ${choices
            .map((choice) => {
              const label = answerLabel(question, choice);
              const stateClass = answerChoiceClass(question, choice, selectedAnswer, feedback);
              return `<button class="big-button answer-btn ${stateClass}" data-value="${choice}" ${reviewing ? 'disabled' : ''}>${label}</button>`;
            })
            .join('')}
        </div>
        ${answerReviewHtml(question, feedback, index, total)}
      </section>
      ${showHelp ? helpOverlayHtml(question.type, question) : ''}
    </div>
  `;
  if (reviewing) {
    root.querySelector('#next-question').addEventListener('click', onContinue);
  } else {
    root.querySelectorAll('.answer-btn').forEach((btn) =>
      btn.addEventListener('click', () => {
        const raw = btn.dataset.value;
        const value = hasOptions ? raw : Number(raw);
        onAnswer(value);
      })
    );
  }
  root.querySelector('#help-button').addEventListener('click', onOpenHelp);
  if (showHelp) {
    root.querySelector('#help-close').addEventListener('click', onCloseHelp);
  }
}

export function renderPairsRound(root, { round, feedback, showPauseReminder, onMatch, showHelp, onOpenHelp, onCloseHelp }) {
  let selectedCalcId = null;

  function draw() {
    const remainingCalc = round.calcTiles.filter((t) => !round.matchedCalcIds.has(t.id));
    const remainingResult = round.resultTiles.filter((t) => !round.matchedResultIds.has(t.id));
    root.innerHTML = `
      <div class="screen mission-screen pairs-screen">
        <button id="help-button" class="help-button" aria-label="Aide">❓</button>
        <div class="progress">${round.matchedCalcIds.size} / ${round.calcTiles.length} paires trouvées</div>
        ${showPauseReminder ? '<p class="pause-reminder">🌸 Tu joues depuis un moment, une petite pause ?</p>' : ''}
        ${feedback ? `<p class="feedback ${feedback}">${feedback === 'correct' ? '🌟 Bravo !' : '🤔 Presque !'}</p>` : ''}
        <div class="pairs-grid">
          <div class="pairs-column">
            ${remainingCalc
              .map((t) => {
                const visual = visualDisplayHtml(t);
                return `<button class="pairs-tile calc-tile ${t.id === selectedCalcId ? 'selected' : ''}" data-id="${t.id}">${visual || t.prompt}</button>`;
              })
              .join('')}
          </div>
          <div class="pairs-column">
            ${remainingResult
              .map((t) => {
                const matchingCalc = round.calcTiles.find((calc) => calc.pairKey === t.pairKey);
                const label = matchingCalc?.type === 'monnaie' ? formatEuroCents(t.answer) : t.answer;
                return `<button class="pairs-tile result-tile" data-id="${t.id}">${label}</button>`;
              })
              .join('')}
          </div>
        </div>
        ${showHelp ? helpOverlayHtml(null) : ''}
      </div>
    `;
    root.querySelectorAll('.calc-tile').forEach((btn) =>
      btn.addEventListener('click', () => {
        selectedCalcId = btn.dataset.id;
        draw();
      })
    );
    root.querySelectorAll('.result-tile').forEach((btn) =>
      btn.addEventListener('click', () => {
        if (!selectedCalcId) return;
        const calcId = selectedCalcId;
        selectedCalcId = null;
        onMatch(calcId, btn.dataset.id);
      })
    );
    root.querySelector('#help-button').addEventListener('click', onOpenHelp);
    if (showHelp) {
      root.querySelector('#help-close').addEventListener('click', onCloseHelp);
    }
  }

  draw();
}

function resultNotionsHtml(breakdown) {
  const attempted = Object.entries(breakdown ?? {})
    .filter(([, stats]) => stats.total > 0)
    .map(([type, stats]) => ({
      type,
      correct: stats.correct,
      total: stats.total,
      percent: Math.round((stats.correct / stats.total) * 100),
    }));
  const strong = attempted.filter((item) => item.percent >= 75);
  const toReview = attempted.filter((item) => item.percent < 75);
  const chips = (items, className) => items.length
    ? items.map((item) => `<li class="result-notion ${className}">${emojiForType(item.type)} <span>${escapeHtml(item.type.replaceAll('-', ' '))}</span><strong>${item.correct}/${item.total}</strong></li>`).join('')
    : '<li class="result-notion-empty">Aucune pour cette mission</li>';
  return `
    <div class="result-notion-group">
      <h3>✅ Bien réussi</h3>
      <ul>${chips(strong, 'result-notion-strong')}</ul>
    </div>
    <div class="result-notion-group">
      <h3>🎯 À retravailler</h3>
      <ul>${chips(toReview, 'result-notion-review')}</ul>
    </div>`;
}

export function renderResults(root, { correctCount, questionsTotal, gainedXp, gainedCoins, coinBreakdown, coinGoal, leveledUp, newBadges, justCompletedDailyChallenge, justCompletedWeeklyGoal, dailyChestReward = null, companionId = 'none-companion', weeklyRewardText, breakdown = {}, incorrectQuestions = [], onRetryMistakes = null, onContinue }) {
  const earnedBadgesData = newBadges.map((id) => BADGES.find((b) => b.id === id)).filter(Boolean);
  const companion = companionForId(companionId);
  const chestsBeforeRare = dailyChestReward ? 3 - (dailyChestReward.dailyChestCount % 3) : 0;
  const scorePercent = questionsTotal ? Math.round((correctCount / questionsTotal) * 100) : 0;
  const appreciation = scorePercent >= 90
    ? 'Excellent travail !'
    : scorePercent >= 70
      ? 'Très belle mission !'
      : scorePercent >= 50
        ? 'Tu progresses bien !'
        : 'Continue, tu vas y arriver !';
  root.innerHTML = `
    <div class="screen results-screen">
      <section class="results-hero">
        <div class="results-medal">${leveledUp ? '🏆' : scorePercent === 100 ? '💯' : '🎉'}</div>
        <div>
          <p class="results-kicker">Mission terminée</p>
          <h1>${appreciation}</h1>
          <p>${correctCount} bonne${correctCount > 1 ? 's' : ''} réponse${correctCount > 1 ? 's' : ''} sur ${questionsTotal}</p>
        </div>
        <div class="score-ring" style="--score:${scorePercent * 3.6}deg" role="img" aria-label="Score ${scorePercent} pour cent">
          <strong>${scorePercent}%</strong>
        </div>
        ${companion.emoji ? `<aside class="result-companion"><span>${companion.emoji}</span><p>${scorePercent >= 80 ? 'Waouh, quelle mission !' : 'Je suis fier de tes efforts !'}</p></aside>` : ''}
      </section>
      <div class="results-grid">
        <section class="results-panel results-notions">
          <h2>Mon bilan</h2>
          ${resultNotionsHtml(breakdown)}
        </section>
        <section class="results-panel results-rewards">
          <h2>Mes gains</h2>
          <div class="results-gains">
            <span class="result-gain gain-pop" style="animation-delay:0.1s">✨ <strong>+${gainedXp}</strong><small>XP</small></span>
            <span class="result-gain gain-pop" style="animation-delay:0.25s">🪙 <strong>+${gainedCoins}</strong><small>pièces</small></span>
          </div>
          ${coinBreakdown ? `<div class="coin-breakdown" aria-label="Détail des pièces gagnées">
            <span><strong>+${coinBreakdown.answerCoins}</strong> bonnes réponses</span>
            ${coinBreakdown.perfectBonus ? `<span><strong>+${coinBreakdown.perfectBonus}</strong> mission parfaite</span>` : ''}
            ${coinBreakdown.dailyBonus ? `<span><strong>+${coinBreakdown.dailyBonus}</strong> défi du jour</span>` : ''}
            ${coinBreakdown.chestBonus ? `<span><strong>+${coinBreakdown.chestBonus}</strong> coffre du jour</span>` : ''}
          </div>` : ''}
          ${coinGoalHtml(coinGoal)}
          ${leveledUp ? '<p class="result-event result-level-up">⭐ Niveau supérieur débloqué !</p>' : ''}
          ${justCompletedDailyChallenge ? '<p class="result-event">🔥 Défi du jour relevé ! Bonus obtenu.</p>' : ''}
          ${justCompletedWeeklyGoal ? `<div class="weekly-bonus-celebration"><div>🎊 🎁 🎊</div><h2>SUPER BONUS DÉBLOQUÉ !</h2><strong>${escapeHtml(weeklyRewardText ?? 'Ta récompense de la semaine')}</strong></div>` : ''}
          ${dailyChestReward ? `<div class="daily-chest-celebration"><div class="opening-chest">🎁</div><p>COFFRE DU JOUR OUVERT</p><strong>+${dailyChestReward.bonusCoins} pièces</strong>${dailyChestReward.treasure ? `<div class="rare-treasure-reveal"><span>${dailyChestReward.treasure.emoji}</span><div><small>OBJET RARE DÉCOUVERT</small><strong>${escapeHtml(dailyChestReward.treasure.name)}</strong></div></div>` : `<small>Encore ${chestsBeforeRare} coffre${chestsBeforeRare > 1 ? 's' : ''} avant le prochain objet rare !</small>`}</div>` : ''}
          ${earnedBadgesData.length
            ? `<p class="badge-earned">🏅 Nouveau badge !</p><div class="new-badge-reveals">${earnedBadgesData.map((b, i) => `<article class="new-badge-reveal" style="--badge-from:${b.gradient[0]};--badge-to:${b.gradient[1]};animation-delay:${0.25 + i * 0.08}s"><span>${b.emoji}</span><div><strong>${escapeHtml(b.label)}</strong><small>${escapeHtml(b.description)}</small></div></article>`).join('')}</div>`
            : ''}
        </section>
      </div>
      <div class="results-actions">
        ${incorrectQuestions.length && onRetryMistakes ? `<button id="retry-mistakes" class="big-button result-retry">🔁 Refaire mes ${incorrectQuestions.length} erreur${incorrectQuestions.length > 1 ? 's' : ''}</button>` : ''}
        <button id="continue" class="big-button">Retour à l'accueil</button>
      </div>
    </div>
  `;
  root.querySelector('#continue').addEventListener('click', onContinue);
  root.querySelector('#retry-mistakes')?.addEventListener('click', onRetryMistakes);
}

export function renderUnlockCelebration(root, { emoji, title, description, actionLabel, onContinue }) {
  root.innerHTML = `
    <div class="screen unlock-celebration-screen">
      <div class="unlock-sparkles" aria-hidden="true">✨ ⭐ ✨</div>
      <div class="unlock-item-reveal" role="img" aria-label="${escapeHtml(title)}">${emoji}</div>
      <p>NOUVEAUTÉ DANS TA COLLECTION</p>
      <h1>${escapeHtml(title)}</h1>
      <span>${escapeHtml(description)}</span>
      <button id="unlock-continue" class="big-button">${escapeHtml(actionLabel)}</button>
    </div>`;
  root.querySelector('#unlock-continue').addEventListener('click', onContinue);
  root.querySelector('#unlock-continue').focus();
}

export function renderRewards(root, { coins, totalXp = 0, availableXp = 0, coinPacks = [], rewards, pendingRewardIds = [], onRequest, onBuyCoinPack, onBack, onNavigate }) {
  const rewardCategories = [
    { id: 'surprise', emoji: '✨', label: 'Petites surprises' },
    { id: 'treat', emoji: '🍰', label: 'Petits plaisirs' },
    { id: 'privilege', emoji: '⭐', label: 'Privilèges' },
    { id: 'treasure', emoji: '🎁', label: 'Grands trésors' },
  ];
  const rewardCatalogue = rewardCategories.map((category) => ({
    ...category,
    rewards: rewards.filter((reward) => (reward.category ?? 'surprise') === category.id),
  })).filter((category) => category.rewards.length > 0);
  root.innerHTML = `
    <div class="screen rewards-screen with-tabs">
      <h1>🎁 Récompenses</h1>
      <p class="coins-balance">🪙 ${coins} pièces disponibles</p>
      <section class="xp-coin-shop">
        <div class="xp-coin-shop-heading">
          <div><p>BOUTIQUE D’XP</p><h2>✨ Transformer mes XP en pièces</h2></div>
          <span><strong>${availableXp}</strong> XP disponibles<small>${totalXp} XP gagnés au total</small></span>
        </div>
        <p class="xp-coin-explanation">Tes XP dépensés restent comptés pour ton niveau et tes déblocages.</p>
        <div class="xp-coin-pack-grid">
          ${coinPacks.map((pack) => {
            const affordable = availableXp >= pack.xpCost;
            return `<article class="xp-coin-pack ${affordable ? 'affordable' : ''}">
              <span class="xp-coin-pack-emoji">${pack.emoji}</span>
              <strong>${escapeHtml(pack.name)}</strong>
              <span class="xp-coin-pack-reward">+${pack.coins} 🪙</span>
              <button class="buy-xp-coin-pack" data-pack-id="${pack.id}" ${affordable ? '' : 'disabled'}>${affordable ? `Échanger ${pack.xpCost} XP` : `Il manque ${pack.xpCost - availableXp} XP`}</button>
            </article>`;
          }).join('')}
        </div>
      </section>
      <div class="real-rewards-heading">
        <div><p>MA BOUTIQUE</p><h2 class="real-rewards-title">🎁 Cadeaux et privilèges</h2></div>
        <span>Je choisis maintenant ou j’économise pour un grand trésor.</span>
      </div>
      ${
        rewards.length
          ? `<div class="reward-category-list">${rewardCatalogue.map((category) => `
              <section class="reward-category-section">
                <h3>${category.emoji} ${category.label}</h3>
                <div class="reward-category-grid">${category.rewards.map((r) => {
                  const pending = pendingRewardIds.includes(r.id);
                  const affordable = coins >= r.cost;
                  const disabled = pending || !affordable;
                  const displayName = r.mystery ? 'Surprise mystère' : r.name;
                  const displayEmoji = r.mystery ? '❓' : (r.emoji ?? '🎁');
                  return `<article class="reward-card ${affordable ? 'reward-affordable' : ''} ${r.mystery ? 'reward-mystery' : ''}">
                    <span class="reward-card-emoji">${escapeHtml(displayEmoji)}</span>
                    <span class="reward-card-name">${escapeHtml(displayName)}</span>
                    ${r.mystery ? '<small>Le contenu reste secret jusqu’à la validation.</small>' : ''}
                    <span class="reward-card-cost">${r.cost} 🪙</span>
                    <button class="big-button reward-exchange" data-id="${r.id}" ${disabled ? 'disabled' : ''}>
                      ${pending ? 'Demande envoyée ⏳' : affordable ? 'Je le veux !' : `Encore ${r.cost - coins} 🪙`}
                    </button>
                  </article>`;
                }).join('')}</div>
              </section>`).join('')}</div>`
          : "<p>Ton parent n'a pas encore ajouté de cadeau ou de privilège.</p>"
      }
      <button id="rewards-back" class="big-button">Retour</button>
    </div>
    ${bottomTabsHtml('recompenses')}
  `;
  root.querySelectorAll('.reward-exchange:not([disabled])').forEach((btn) =>
    btn.addEventListener('click', () => onRequest(btn.dataset.id))
  );
  root.querySelectorAll('.buy-xp-coin-pack:not([disabled])').forEach((btn) =>
    btn.addEventListener('click', () => onBuyCoinPack(btn.dataset.packId))
  );
  root.querySelector('#rewards-back').addEventListener('click', onBack);
  attachBottomTabs(root, onNavigate);
}

export function renderBadgeAlbum(root, { profile, onBack }) {
  const collection = badgeCollectionData(profile);
  const earnedCount = collection.filter((badge) => badge.earned).length;
  const percent = Math.round((earnedCount / collection.length) * 100);
  const nextBadge = collection
    .filter((badge) => !badge.earned)
    .sort((a, b) => b.progressPercent - a.progressPercent)[0];
  root.innerHTML = `
    <div class="screen badge-album-screen">
      <header class="badge-album-hero">
        <div><p>MON ALBUM D’EXPLOITS</p><h1>🏅 Mes badges</h1><span>Chaque badge raconte une victoire différente.</span></div>
        <div class="badge-album-total"><strong>${earnedCount}</strong><span>sur ${collection.length}</span><small>${percent}% complété</small></div>
      </header>
      <div class="xp-bar badge-album-progress" role="progressbar" aria-label="Album complété à ${percent}%" aria-valuenow="${earnedCount}" aria-valuemin="0" aria-valuemax="${collection.length}">
        <div class="xp-bar-fill" style="width:${percent}%"></div>
      </div>
      ${nextBadge ? `<aside class="next-badge-card">
        <span class="next-badge-icon">${nextBadge.emoji}</span>
        <div><small>MON PROCHAIN BADGE</small><strong>${escapeHtml(nextBadge.label)}</strong><span>${escapeHtml(nextBadge.description)}</span></div>
        <div class="next-badge-progress"><strong>${nextBadge.progressLabel}</strong><span><i style="width:${nextBadge.progressPercent}%"></i></span></div>
      </aside>` : '<aside class="next-badge-card badge-album-complete">👑 Album complet : quelle légende !</aside>'}
      <div class="badge-album-categories">
        ${BADGE_CATEGORIES.map((category) => {
          const badges = collection.filter((badge) => badge.category === category.id);
          const categoryEarned = badges.filter((badge) => badge.earned).length;
          return `<section class="badge-album-category">
            <div class="badge-album-category-heading"><div><h2>${category.emoji} ${category.label}</h2><p>${escapeHtml(category.description)}</p></div><strong>${categoryEarned}/${badges.length}</strong></div>
            <div class="badge-album-grid">${badges.map((badge) => `
              <article class="badge-album-card ${badge.earned ? 'earned' : 'locked'}">
                <div class="badge-album-medallion" style="--badge-from:${badge.gradient[0]};--badge-to:${badge.gradient[1]}">${badge.earned ? badge.emoji : `<span>${badge.secret ? '❔' : badge.emoji}</span><i>🔒</i>`}</div>
                <div class="badge-album-card-copy"><h3>${escapeHtml(badge.secret && !badge.earned ? 'Badge secret' : badge.label)}</h3><p>${escapeHtml(badge.secret && !badge.earned ? 'Une surprise rare révélera ce badge…' : badge.description)}</p></div>
                ${badge.earned
                  ? `<span class="badge-earned-date">✓ Gagné${badge.unlockedAtLabel ? ` le ${badge.unlockedAtLabel}` : ''}</span>`
                  : `<div class="badge-card-progress"><span><i style="width:${badge.progressPercent}%"></i></span><small>${badge.progressLabel}</small></div>`}
              </article>`).join('')}</div>
          </section>`;
        }).join('')}
      </div>
      <button id="badge-album-back" class="big-button">Retour</button>
    </div>
  `;
  root.querySelector('#badge-album-back').addEventListener('click', onBack);
}

export function renderConnectionError(root, { onRetry }) {
  root.innerHTML = `
    <div class="screen error-screen">
      <h1>🌥️ Petit souci de connexion</h1>
      <p>Vérifie le Wi-Fi et réessaie.</p>
      <button id="retry" class="big-button">Réessayer</button>
    </div>
  `;
  root.querySelector('#retry').addEventListener('click', onRetry);
}
