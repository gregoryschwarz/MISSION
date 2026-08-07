import { emojiForType, renderBadgeMedallionsHtml } from '../shared/badges.js';
import { HELP_TEXT, helpTextForType } from '../shared/helpContent.js';
import { dynamicHintSteps } from './hints.js';
import { shapeSvg } from './shapes.js';

export function renderPairing(root, { onSubmit, error }) {
  root.innerHTML = `
    <div class="screen pairing-screen">
      <h1>🦄 Missions d'Ambre</h1>
      <p>Un parent doit entrer le code d'appairage et le code secret.</p>
      <form id="pairing-form">
        <label>Code d'appairage<input id="family-id" type="text" autocomplete="off" required /></label>
        <label>Code secret (4 chiffres)<input id="pin" type="password" inputmode="numeric" maxlength="4" required /></label>
        ${error ? '<p class="error" id="pairing-error"></p>' : ''}
        <button type="submit" class="big-button">Valider</button>
      </form>
    </div>
  `;
  if (error) {
    root.querySelector('#pairing-error').textContent = error;
  }
  root.querySelector('#pairing-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const familyId = root.querySelector('#family-id').value.trim();
    const pin = root.querySelector('#pin').value.trim();
    onSubmit({ familyId, pin });
  });
}

const FOCUS_LABELS = {
  addition: "l'addition",
  soustraction: 'la soustraction',
  multiplication: 'la multiplication',
  comparaison: 'la comparaison',
  division: 'la division',
  fraction: 'les fractions',
  geometrie: 'la géométrie',
};

export function renderHome(root, { childName, avatarLevel, badges, auraClass, characterEmoji, accessoryEmoji, soundEnabled, focusType, onStartMission, onToggleSound, onCustomize }) {
  root.innerHTML = `
    <div class="screen home-screen">
      <button id="sound-toggle" class="sound-toggle" aria-label="Activer ou couper le son">${soundEnabled ? '🔊' : '🔇'}</button>
      <div class="avatar-wrapper">
        <div class="avatar ${auraClass}">${characterEmoji}</div>
        ${accessoryEmoji ? `<span class="avatar-accessory">${accessoryEmoji}</span>` : ''}
      </div>
      <h1><span id="child-name"></span> — niveau ${avatarLevel}</h1>
      ${focusType ? `<p class="focus-banner">${emojiForType(focusType)} Aujourd'hui, on s'entraîne sur ${FOCUS_LABELS[focusType]} !</p>` : ''}
      ${renderBadgeMedallionsHtml(badges)}
      <button id="customize" class="big-button">🎨 Personnaliser</button>
      <button id="start-mission" class="big-button">✨ Mission du jour</button>
    </div>
  `;
  root.querySelector('#child-name').textContent = childName ?? 'Ambre';
  root.querySelector('#start-mission').addEventListener('click', onStartMission);
  root.querySelector('#sound-toggle').addEventListener('click', onToggleSound);
  root.querySelector('#customize').addEventListener('click', onCustomize);
}

function customizeMedallionHtml(item, selectedId) {
  if (!item.unlocked) {
    return `<div class="badge-medallion locked" title="${item.emoji}">🔒</div>`;
  }
  const isSelected = item.id === selectedId;
  return `<button class="badge-medallion selectable ${isSelected ? 'selected' : ''}" data-id="${item.id}">${item.emoji}</button>`;
}

export function renderCustomize(root, { characters, accessories, selectedCharacterId, selectedAccessoryId, onSelectCharacter, onSelectAccessory, onBack }) {
  root.innerHTML = `
    <div class="screen customize-screen">
      <h1>🎨 Personnaliser</h1>
      <p class="customize-section-title">Personnage</p>
      <div class="badges-row" id="character-options">
        ${characters.map((c) => customizeMedallionHtml(c, selectedCharacterId)).join('')}
      </div>
      <p class="customize-section-title">Accessoire</p>
      <div class="badges-row" id="accessory-options">
        ${accessories.map((a) => customizeMedallionHtml(a, selectedAccessoryId)).join('')}
      </div>
      <button id="customize-back" class="big-button">Retour</button>
    </div>
  `;
  root.querySelectorAll('#character-options .badge-medallion.selectable').forEach((btn) =>
    btn.addEventListener('click', () => onSelectCharacter(btn.dataset.id))
  );
  root.querySelectorAll('#accessory-options .badge-medallion.selectable').forEach((btn) =>
    btn.addEventListener('click', () => onSelectAccessory(btn.dataset.id))
  );
  root.querySelector('#customize-back').addEventListener('click', onBack);
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
      <div class="progress">Question ${index + 1} / ${total}</div>
      ${showPauseReminder ? '<p class="pause-reminder">🌸 Tu joues depuis un moment, une petite pause ?</p>' : ''}
      <h2>${question.prompt}</h2>
      ${question.shape ? `<div class="shape-display">${shapeSvg(question.shape)}</div>` : ''}
      ${feedback ? `<p class="feedback ${feedback}">${feedback === 'correct' ? '🌟 Bravo !' : '🤔 Presque !'}</p>` : ''}
      ${hasOptions
        ? `<div class="options">
            ${question.options
              .map((choice) => {
                const label = choice === '>' ? 'supérieur &gt;' : choice === '<' ? 'inférieur &lt;' : choice;
                return `<button class="big-button answer-btn" data-value="${choice}">${label}</button>`;
              })
              .join('')}
          </div>`
        : `<form id="answer-form">
            <input id="answer-input" type="number" inputmode="numeric" required />
            <button type="submit" class="big-button">Valider</button>
          </form>`}
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
      const value = Number(root.querySelector('#answer-input').value);
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
      <div class="progress">Question ${index + 1} / ${total}</div>
      ${showPauseReminder ? '<p class="pause-reminder">🌸 Tu joues depuis un moment, une petite pause ?</p>' : ''}
      <h2>${question.prompt}</h2>
      ${question.shape ? `<div class="shape-display">${shapeSvg(question.shape)}</div>` : ''}
      ${feedback ? `<p class="feedback ${feedback}">${feedback === 'correct' ? '🌟 Bravo !' : '🤔 Presque !'}</p>` : ''}
      <div class="options">
        ${choices
          .map((choice) => {
            const label = choice === '>' ? 'supérieur &gt;' : choice === '<' ? 'inférieur &lt;' : choice;
            return `<button class="big-button answer-btn" data-value="${choice}">${label}</button>`;
          })
          .join('')}
      </div>
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
              .map(
                (t) =>
                  `<button class="pairs-tile calc-tile ${t.id === selectedCalcId ? 'selected' : ''}" data-id="${t.id}">${t.shape ? `<div class="shape-display">${shapeSvg(t.shape)}</div>` : t.prompt}</button>`
              )
              .join('')}
          </div>
          <div class="pairs-column">
            ${remainingResult
              .map((t) => `<button class="pairs-tile result-tile" data-id="${t.id}">${t.answer}</button>`)
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

export function renderResults(root, { correctCount, questionsTotal, gainedXp, leveledUp, newBadges, onContinue }) {
  root.innerHTML = `
    <div class="screen results-screen">
      <h1>🎉 Mission terminée !</h1>
      <div class="confetti">
        <span style="left:10%">🎉</span>
        <span style="left:30%">✨</span>
        <span style="left:50%">🎊</span>
        <span style="left:70%">✨</span>
        <span style="left:90%">🎉</span>
      </div>
      <p>${correctCount} / ${questionsTotal} bonnes réponses</p>
      <p>+${gainedXp} XP</p>
      ${leveledUp ? '<p class="level-up">⭐ Niveau supérieur débloqué !</p>' : ''}
      ${newBadges.length ? `<p class="badge-earned">🏅 Nouveau badge : ${newBadges.join(', ')}</p>` : ''}
      <button id="continue" class="big-button">Retour à l'accueil</button>
    </div>
  `;
  root.querySelector('#continue').addEventListener('click', onContinue);
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
