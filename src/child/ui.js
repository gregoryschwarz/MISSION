import { renderBadgeMedallionsHtml } from '../shared/badges.js';

export function renderPairing(root, { onSubmit, error }) {
  root.innerHTML = `
    <div class="screen pairing-screen">
      <h1>🦄 Missions de Luna</h1>
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

export function renderHome(root, { childName, avatarLevel, badges, auraClass, soundEnabled, onStartMission, onToggleSound }) {
  root.innerHTML = `
    <div class="screen home-screen">
      <button id="sound-toggle" class="sound-toggle" aria-label="Activer ou couper le son">${soundEnabled ? '🔊' : '🔇'}</button>
      <div class="avatar ${auraClass}">🦄</div>
      <h1><span id="child-name"></span> — niveau ${avatarLevel}</h1>
      ${renderBadgeMedallionsHtml(badges)}
      <button id="start-mission" class="big-button">✨ Mission du jour</button>
    </div>
  `;
  root.querySelector('#child-name').textContent = childName ?? 'Luna';
  root.querySelector('#start-mission').addEventListener('click', onStartMission);
  root.querySelector('#sound-toggle').addEventListener('click', onToggleSound);
}

export function renderQuestion(root, { question, index, total, onAnswer, feedback, showPauseReminder }) {
  const isComparison = question.type === 'comparaison';
  root.innerHTML = `
    <div class="screen mission-screen">
      <div class="progress">Question ${index + 1} / ${total}</div>
      ${showPauseReminder ? '<p class="pause-reminder">🌸 Tu joues depuis un moment, une petite pause ?</p>' : ''}
      <h2>${question.prompt}</h2>
      ${feedback ? `<p class="feedback ${feedback}">${feedback === 'correct' ? '🌟 Bravo !' : '🤔 Presque !'}</p>` : ''}
      ${isComparison
        ? `<div class="options">
            <button class="big-button answer-btn" data-value=">">supérieur &gt;</button>
            <button class="big-button answer-btn" data-value="<">inférieur &lt;</button>
          </div>`
        : `<form id="answer-form">
            <input id="answer-input" type="number" inputmode="numeric" required />
            <button type="submit" class="big-button">Valider</button>
          </form>`}
    </div>
  `;
  if (isComparison) {
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
}

export function renderQuestionQcm(root, { question, choices, index, total, onAnswer, feedback, showPauseReminder }) {
  root.innerHTML = `
    <div class="screen mission-screen">
      <div class="progress">Question ${index + 1} / ${total}</div>
      ${showPauseReminder ? '<p class="pause-reminder">🌸 Tu joues depuis un moment, une petite pause ?</p>' : ''}
      <h2>${question.prompt}</h2>
      ${feedback ? `<p class="feedback ${feedback}">${feedback === 'correct' ? '🌟 Bravo !' : '🤔 Presque !'}</p>` : ''}
      <div class="options">
        ${choices
          .map((choice) => {
            const label = choice === '>' ? 'supérieur &gt;' : choice === '<' ? 'inférieur &lt;' : choice;
            return `<button class="big-button answer-btn" data-value="${choice}">${label}</button>`;
          })
          .join('')}
      </div>
    </div>
  `;
  root.querySelectorAll('.answer-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      const raw = btn.dataset.value;
      const value = raw === '>' || raw === '<' ? raw : Number(raw);
      onAnswer(value);
    })
  );
}

export function renderPairsRound(root, { round, feedback, showPauseReminder, onMatch }) {
  let selectedCalcId = null;

  function draw() {
    const remainingCalc = round.calcTiles.filter((t) => !round.matchedCalcIds.has(t.id));
    const remainingResult = round.resultTiles.filter((t) => !round.matchedResultIds.has(t.id));
    root.innerHTML = `
      <div class="screen mission-screen pairs-screen">
        <div class="progress">${round.matchedCalcIds.size} / ${round.calcTiles.length} paires trouvées</div>
        ${showPauseReminder ? '<p class="pause-reminder">🌸 Tu joues depuis un moment, une petite pause ?</p>' : ''}
        ${feedback ? `<p class="feedback ${feedback}">${feedback === 'correct' ? '🌟 Bravo !' : '🤔 Presque !'}</p>` : ''}
        <div class="pairs-grid">
          <div class="pairs-column">
            ${remainingCalc
              .map(
                (t) =>
                  `<button class="pairs-tile calc-tile ${t.id === selectedCalcId ? 'selected' : ''}" data-id="${t.id}">${t.prompt}</button>`
              )
              .join('')}
          </div>
          <div class="pairs-column">
            ${remainingResult
              .map((t) => `<button class="pairs-tile result-tile" data-id="${t.id}">${t.answer}</button>`)
              .join('')}
          </div>
        </div>
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
