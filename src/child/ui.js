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

export function renderHome(root, { childName, avatarLevel, badgesCount, onStartMission }) {
  root.innerHTML = `
    <div class="screen home-screen">
      <div class="avatar">🦄</div>
      <h1><span id="child-name"></span> — niveau ${avatarLevel}</h1>
      <p>${badgesCount} badge${badgesCount > 1 ? 's' : ''} gagné${badgesCount > 1 ? 's' : ''}</p>
      <button id="start-mission" class="big-button">✨ Mission du jour</button>
    </div>
  `;
  root.querySelector('#child-name').textContent = childName ?? 'Luna';
  root.querySelector('#start-mission').addEventListener('click', onStartMission);
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

export function renderResults(root, { correctCount, questionsTotal, gainedXp, leveledUp, newBadges, onContinue }) {
  root.innerHTML = `
    <div class="screen results-screen">
      <h1>🎉 Mission terminée !</h1>
      <p>${correctCount} / ${questionsTotal} bonnes réponses</p>
      <p>+${gainedXp} XP</p>
      ${leveledUp ? '<p class="level-up">⭐ Niveau supérieur débloqué !</p>' : ''}
      ${newBadges.length ? `<p class="badge-earned">🏅 Nouveau badge : ${newBadges.join(', ')}</p>` : ''}
      <button id="continue" class="big-button">Retour à l'accueil</button>
    </div>
  `;
  root.querySelector('#continue').addEventListener('click', onContinue);
}
