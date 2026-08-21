import { emojiForType, renderBadgeMedallionsHtml, badgeAlbumData, BADGES } from '../shared/badges.js';
import { HELP_TEXT, helpTextForType } from '../shared/helpContent.js';
import { DIFFICULTY_LABELS } from '../shared/difficulty.js';
import { dynamicHintSteps } from './hints.js';
import { shapeSvg } from './shapes.js';
import { coinSvg, formatEuroCents, parseEuroInput } from './money.js';
import { lengthBarSvg } from './length.js';
import { clockFaceSvg } from './clock.js';
import { visualForCharacter, HATS, CAPES } from '../shared/avatarCustomization.js';

function blockAvatarHtml(characterId, hatId = 'none-hat', capeId = 'none-cape', compact = false) {
  const visual = visualForCharacter(characterId);
  const safeHat = HATS.some((item) => item.id === hatId) ? hatId : 'none-hat';
  const safeCape = CAPES.some((item) => item.id === capeId) ? capeId : 'none-cape';
  return `<div class="block-avatar ${compact ? 'block-avatar-compact' : ''} character-${visual.id} hat-${safeHat} cape-${safeCape}" style="--avatar-skin:${visual.skin};--avatar-hair:${visual.hair};--avatar-outfit:${visual.outfit};--avatar-accent:${visual.accent}" role="img" aria-label="${visual.name}">
    <span class="block-cape"></span><span class="block-body"></span><span class="block-arm block-arm-left"></span><span class="block-arm block-arm-right"></span>
    <span class="block-head"><span class="block-hair"></span><span class="block-eye block-eye-left"></span><span class="block-eye block-eye-right"></span><span class="block-smile"></span></span>
    <span class="block-hat"></span><span class="block-leg block-leg-left"></span><span class="block-leg block-leg-right"></span>
  </div>`;
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

export function renderHome(root, { childName, avatarLevel, xpProgress, streakDays, streakStatus, totalCorrectCount, coins, dailyChallengeProgress, dailyChallengeCompleted, dailyChallengeTarget, weeklyGoalProgress, weeklyGoalTarget, weeklyRewardText, weeklyRewardDays, dailyMissionLimit, dailyMissionCount, badges, auraClass, characterId, hatId, capeId, decorGradient, soundEnabled, focusType, onStartMission, onToggleSound, onCustomize, onChooseNotion, onStartFrenchMission, onShowRewards, onShowBadgeAlbum, onNavigate }) {
  const xpPercent = xpProgress ? Math.round((xpProgress.current / xpProgress.target) * 100) : 0;
  root.innerHTML = `
    <div class="screen home-screen with-tabs">
      <div class="home-header" style="background:${decorGradient ?? ''}">
        <button id="sound-toggle" class="sound-toggle" aria-label="Activer ou couper le son">${soundEnabled ? '🔊' : '🔇'}</button>
        <div class="avatar-wrapper">
          <div class="avatar ${auraClass}">${blockAvatarHtml(characterId, hatId, capeId)}</div>
        </div>
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
            ${dailyMissionLimit > 0 ? `<p class="daily-limit-banner ${dailyMissionCount >= dailyMissionLimit ? 'limit-reached' : ''}">${dailyMissionCount >= dailyMissionLimit ? '🌙 Bravo, objectif du jour terminé. Reviens demain !' : `⏱️ ${dailyMissionCount}/${dailyMissionLimit} missions aujourd’hui`}</p>` : ''}
            ${focusType ? `<p class="focus-banner">${emojiForType(focusType)} Aujourd'hui, on s'entraîne sur ${FOCUS_LABELS[focusType]} !</p>` : ''}
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
  root.querySelector('#daily-challenge-start')?.addEventListener('click', onStartMission);
  attachBottomTabs(root, onNavigate);
}

// `coins` n'est fourni que pour les catégories achetables (les personnages) :
// un médaillon verrouillé mais avec un coût affiche alors un bouton d'achat
// plutôt qu'un simple cadenas — cf. les maquettes ("🔒 80").
function customizeMedallionHtml(item, selectedId, coins = null) {
  const label = item.name ?? item.emoji ?? '';
  if (!item.unlocked) {
    if (coins !== null && item.cost > 0) {
      const affordable = coins >= item.cost;
      return `<button class="badge-medallion buyable ${affordable ? '' : 'unaffordable'}" data-id="${item.id}" data-cost="${item.cost}" title="${label} — ${item.cost} 🪙">
        <span class="medallion-lock">🔒</span>
        <span class="medallion-cost">${item.cost}🪙</span>
      </button>`;
    }
    return `<div class="badge-medallion locked" title="${label}">🔒</div>`;
  }
  const isSelected = item.id === selectedId;
  const content = item.skin ? blockAvatarHtml(item.id, 'none-hat', 'none-cape', true) : (item.emoji ?? '🚫');
  return `<button class="badge-medallion selectable ${isSelected ? 'selected' : ''}" data-id="${item.id}" title="${label}">${content}</button>`;
}

function customizeDecorSwatchHtml(decor, selectedId) {
  if (!decor.unlocked) {
    return `<div class="decor-swatch locked" title="${decor.name}">🔒</div>`;
  }
  const isSelected = decor.id === selectedId;
  const gradient = `linear-gradient(160deg, ${decor.gradient.join(', ')})`;
  return `<button class="decor-swatch selectable ${isSelected ? 'selected' : ''}" data-id="${decor.id}" title="${decor.name}" style="background:${gradient}"></button>`;
}

export function renderCustomize(root, { characters, hats, capes, decors, coins = 0, selectedCharacterId, selectedHatId, selectedCapeId, selectedDecorId, onSelectCharacter, onSelectHat, onSelectCape, onSelectDecor, onPurchaseCharacter, onBack, onNavigate }) {
  root.innerHTML = `
    <div class="screen customize-screen with-tabs">
      <h1>🎨 Personnaliser</h1>
      <p class="coins-balance">🪙 ${coins} pièces disponibles</p>
      <p class="customize-section-title">Personnage</p>
      <div class="badges-row" id="character-options">
        ${characters.map((c) => customizeMedallionHtml(c, selectedCharacterId, coins)).join('')}
      </div>
      <p class="customize-section-title">Chapeau</p>
      <div class="badges-row" id="hat-options">
        ${hats.map((h) => customizeMedallionHtml(h, selectedHatId)).join('')}
      </div>
      <p class="customize-section-title">Cape</p>
      <div class="badges-row" id="cape-options">
        ${capes.map((c) => customizeMedallionHtml(c, selectedCapeId)).join('')}
      </div>
      <p class="customize-section-title">Décor</p>
      <div class="badges-row" id="decor-options">
        ${decors.map((d) => customizeDecorSwatchHtml(d, selectedDecorId)).join('')}
      </div>
      <button id="customize-back" class="big-button">Retour</button>
    </div>
    ${bottomTabsHtml('avatar')}
  `;
  root.querySelectorAll('#character-options .badge-medallion.selectable').forEach((btn) =>
    btn.addEventListener('click', () => onSelectCharacter(btn.dataset.id))
  );
  root.querySelectorAll('#character-options .badge-medallion.buyable:not(.unaffordable)').forEach((btn) =>
    btn.addEventListener('click', () => onPurchaseCharacter(btn.dataset.id, Number(btn.dataset.cost)))
  );
  root.querySelectorAll('#hat-options .badge-medallion.selectable').forEach((btn) =>
    btn.addEventListener('click', () => onSelectHat(btn.dataset.id))
  );
  root.querySelectorAll('#cape-options .badge-medallion.selectable').forEach((btn) =>
    btn.addEventListener('click', () => onSelectCape(btn.dataset.id))
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

export function renderQuestion(root, { question, index, total, onAnswer, feedback, showPauseReminder, showHelp, onOpenHelp, onCloseHelp }) {
  const hasOptions = Array.isArray(question.options);
  root.innerHTML = `
    <div class="screen mission-screen">
      <button id="help-button" class="help-button" aria-label="Aide">❓</button>
      ${missionProgressHtml(index, total)}
      ${showPauseReminder ? '<p class="pause-reminder">🌸 Tu joues depuis un moment, une petite pause ?</p>' : ''}
      <section class="mission-card">
        <h2>${question.prompt}</h2>
        ${visualDisplayHtml(question)}
        ${feedback ? `<p class="feedback ${feedback}">${feedback === 'correct' ? '🌟 Bravo !' : '🤔 Presque !'}</p>` : ''}
        ${hasOptions
          ? `<div class="options mission-options">
              ${question.options
                .map((choice) => {
                  const label = answerLabel(question, choice);
                  return `<button class="big-button answer-btn" data-value="${choice}">${label}</button>`;
                })
                .join('')}
            </div>`
          : `<form id="answer-form" class="answer-form">
              <label class="answer-label" for="answer-input">Ta réponse</label>
              <input id="answer-input" type="${question.type === 'monnaie' ? 'text' : 'number'}" inputmode="${question.type === 'monnaie' ? 'decimal' : 'numeric'}" placeholder="${question.type === 'monnaie' ? '0,00 €' : 'Écris ta réponse'}" ${question.type === 'monnaie' ? 'aria-describedby="money-answer-hint"' : ''} required />
              ${question.type === 'monnaie' ? '<small id="money-answer-hint" class="answer-hint">Tu peux écrire 7 ou 7,00 €</small>' : ''}
              <button type="submit" class="big-button">Valider ma réponse</button>
            </form>`}
      </section>
      ${showHelp ? helpOverlayHtml(question.type, question) : ''}
    </div>
  `;
  if (hasOptions) {
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

export function renderQuestionQcm(root, { question, choices, index, total, onAnswer, feedback, showPauseReminder, showHelp, onOpenHelp, onCloseHelp }) {
  const hasOptions = Array.isArray(question.options);
  root.innerHTML = `
    <div class="screen mission-screen">
      <button id="help-button" class="help-button" aria-label="Aide">❓</button>
      ${missionProgressHtml(index, total)}
      ${showPauseReminder ? '<p class="pause-reminder">🌸 Tu joues depuis un moment, une petite pause ?</p>' : ''}
      <section class="mission-card">
        <h2>${question.prompt}</h2>
        ${visualDisplayHtml(question)}
        ${feedback ? `<p class="feedback ${feedback}">${feedback === 'correct' ? '🌟 Bravo !' : '🤔 Presque !'}</p>` : ''}
        <div class="options mission-options">
          ${choices
            .map((choice) => {
              const label = answerLabel(question, choice);
              return `<button class="big-button answer-btn" data-value="${choice}">${label}</button>`;
            })
            .join('')}
        </div>
      </section>
      ${showHelp ? helpOverlayHtml(question.type, question) : ''}
    </div>
  `;
  root.querySelectorAll('.answer-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      const raw = btn.dataset.value;
      const value = hasOptions ? raw : Number(raw);
      onAnswer(value);
    })
  );
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

export function renderResults(root, { correctCount, questionsTotal, gainedXp, gainedCoins, leveledUp, newBadges, justCompletedDailyChallenge, justCompletedWeeklyGoal, weeklyRewardText, onContinue }) {
  const earnedBadgesData = newBadges.map((id) => BADGES.find((b) => b.id === id)).filter(Boolean);
  root.innerHTML = `
    <div class="screen results-screen">
      <div class="results-medal">${leveledUp ? '🏆' : '🎉'}</div>
      <h1>Mission terminée !</h1>
      <div class="confetti">
        <span style="left:10%">🎉</span>
        <span style="left:30%">✨</span>
        <span style="left:50%">🎊</span>
        <span style="left:70%">✨</span>
        <span style="left:90%">🎉</span>
      </div>
      <p>${correctCount} / ${questionsTotal} bonnes réponses</p>
      <div class="results-gains">
        <span class="stat-pill stat-pill-light gain-pop" style="animation-delay:0.1s">✨ +${gainedXp} XP</span>
        ${gainedCoins ? `<span class="stat-pill stat-pill-light gain-pop" style="animation-delay:0.25s">🪙 +${gainedCoins}</span>` : ''}
      </div>
      ${leveledUp ? '<p class="level-up-banner">⭐ Niveau supérieur débloqué !</p>' : ''}
      ${justCompletedDailyChallenge ? '<p class="level-up">🔥 Défi du jour relevé ! Bonus +20 XP et +10 🪙</p>' : ''}
      ${justCompletedWeeklyGoal ? `<div class="weekly-bonus-celebration"><div>🎊 🎁 🎊</div><h2>SUPER BONUS DÉBLOQUÉ !</h2><strong>${escapeHtml(weeklyRewardText ?? 'Ta récompense de la semaine')}</strong></div>` : ''}
      ${
        earnedBadgesData.length
          ? `<p class="badge-earned">🏅 Nouveau badge !</p>
             <div class="badges-row">
               ${earnedBadgesData
                 .map(
                   (b, i) =>
                     `<div class="badge-medallion earned badge-pop" style="background: linear-gradient(135deg, ${b.gradient[0]}, ${b.gradient[1]});animation-delay:${0.4 + i * 0.15}s" title="${b.label}">${b.emoji}</div>`
                 )
                 .join('')}
             </div>`
          : ''
      }
      <button id="continue" class="big-button">Retour à l'accueil</button>
    </div>
  `;
  root.querySelector('#continue').addEventListener('click', onContinue);
}

export function renderRewards(root, { coins, rewards, pendingRewardIds = [], onRequest, onBack, onNavigate }) {
  root.innerHTML = `
    <div class="screen rewards-screen with-tabs">
      <h1>🎁 Récompenses</h1>
      <p class="coins-balance">🪙 ${coins} pièces disponibles</p>
      ${
        rewards.length
          ? rewards
              .map((r) => {
                const pending = pendingRewardIds.includes(r.id);
                const affordable = coins >= r.cost;
                const disabled = pending || !affordable;
                return `
                  <div class="reward-card">
                    <span class="reward-card-name"><span class="reward-card-emoji">${escapeHtml(r.emoji ?? '🎁')}</span>${escapeHtml(r.name)}</span>
                    <span class="reward-card-cost">${r.cost} 🪙</span>
                    <button class="big-button reward-exchange" data-id="${r.id}" ${disabled ? 'disabled' : ''}>
                      ${pending ? 'Demande envoyée ⏳' : 'Échanger'}
                    </button>
                  </div>`;
              })
              .join('')
          : "<p>Ton parent n'a pas encore ajouté de récompense.</p>"
      }
      <button id="rewards-back" class="big-button">Retour</button>
    </div>
    ${bottomTabsHtml('recompenses')}
  `;
  root.querySelectorAll('.reward-exchange:not([disabled])').forEach((btn) =>
    btn.addEventListener('click', () => onRequest(btn.dataset.id))
  );
  root.querySelector('#rewards-back').addEventListener('click', onBack);
  attachBottomTabs(root, onNavigate);
}

export function renderBadgeAlbum(root, { earnedBadgeIds, badgeDates, totalBadgeCount, onBack }) {
  const album = badgeAlbumData(earnedBadgeIds, badgeDates);
  const percent = totalBadgeCount ? Math.round((album.length / totalBadgeCount) * 100) : 0;
  root.innerHTML = `
    <div class="screen badge-album-screen">
      <h1>🏅 Ma collection</h1>
      <p class="badge-album-count">${album.length} badge${album.length > 1 ? 's' : ''} sur ${totalBadgeCount}</p>
      <div class="xp-bar badge-album-progress" role="progressbar" aria-valuenow="${album.length}" aria-valuemin="0" aria-valuemax="${totalBadgeCount}">
        <div class="xp-bar-fill" style="width:${percent}%"></div>
      </div>
      ${
        album.length
          ? `<h2>Badges gagnés 🎉</h2><ul class="badge-album-list">${album
              .map(
                (b) => `
              <li class="badge-album-entry">
                <div class="badge-medallion" style="background: linear-gradient(135deg, ${b.gradient[0]}, ${b.gradient[1]})">${b.emoji}</div>
                <div>
                  <p class="badge-album-label">${b.label}</p>
                  ${b.unlockedAtLabel ? `<p class="badge-album-date">🔓 Débloqué le ${b.unlockedAtLabel}</p>` : ''}
                </div>
              </li>`
              )
              .join('')}</ul>`
          : "<p>Pas encore de badge — lance une mission pour commencer à en gagner !</p>"
      }
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
