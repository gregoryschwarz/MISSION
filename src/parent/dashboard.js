import { emojiForType, renderBadgeMedallionsHtml } from '../shared/badges.js';
import { DIFFICULTY_LABELS, DEFAULT_DIFFICULTY_LEVELS } from '../shared/difficulty.js';
import { weekStartKey } from '../shared/progression.js';

export function aggregateBreakdown(sessions) {
  const totals = {};
  sessions.forEach((session) => {
    Object.entries(session.breakdown).forEach(([type, { correct, total }]) => {
      if (!totals[type]) totals[type] = { correct: 0, total: 0 };
      totals[type].correct += correct;
      totals[type].total += total;
    });
  });
  return Object.fromEntries(
    Object.entries(totals).map(([type, { correct, total }]) => [
      type,
      total === 0 ? 0 : Math.round((correct / total) * 100),
    ])
  );
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = dimanche, 1 = lundi, ...
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(weekStart) {
  const dd = String(weekStart.getUTCDate()).padStart(2, '0');
  const mm = String(weekStart.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

function formatBucketKey(weekStart) {
  return weekStart.toISOString().slice(0, 10);
}

export function weeklyBreakdownByType(sessions, { weekCount = 8, referenceDate = new Date() } = {}) {
  const currentWeekStart = startOfWeek(referenceDate);
  const weekStarts = [];
  for (let i = weekCount - 1; i >= 0; i -= 1) {
    weekStarts.push(new Date(currentWeekStart.getTime() - i * WEEK_MS));
  }

  const types = new Set();
  sessions.forEach((session) => {
    Object.keys(session.breakdown).forEach((type) => types.add(type));
  });

  const buckets = {}; // bucketKey (year-aware) -> { type -> { correct, total } }
  weekStarts.forEach((weekStart) => {
    buckets[formatBucketKey(weekStart)] = {};
  });

  sessions.forEach((session) => {
    const sessionWeekStart = startOfWeek(new Date(session.date));
    const bucketKey = formatBucketKey(sessionWeekStart);
    if (!(bucketKey in buckets)) return; // hors de la fenêtre des weekCount semaines
    Object.entries(session.breakdown).forEach(([type, { correct, total }]) => {
      if (!buckets[bucketKey][type]) buckets[bucketKey][type] = { correct: 0, total: 0 };
      buckets[bucketKey][type].correct += correct;
      buckets[bucketKey][type].total += total;
    });
  });

  const result = {};
  types.forEach((type) => {
    result[type] = weekStarts.map((weekStart) => {
      const bucketKey = formatBucketKey(weekStart);
      const entry = buckets[bucketKey][type];
      return {
        weekLabel: formatWeekLabel(weekStart),
        percent: entry && entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : null,
      };
    });
  });
  return result;
}

// Point fort / à travailler : ne se prononce que sur les notions ayant assez
// de questions répondues (minAttempts) pour être significatives.
export function computeInsights(sessions, { minAttempts = 3 } = {}) {
  const totals = {};
  sessions.forEach((session) => {
    Object.entries(session.breakdown ?? {}).forEach(([type, { correct, total }]) => {
      if (!totals[type]) totals[type] = { correct: 0, total: 0 };
      totals[type].correct += correct;
      totals[type].total += total;
    });
  });
  const eligible = Object.entries(totals)
    .filter(([, { total }]) => total >= minAttempts)
    .map(([type, { correct, total }]) => ({ type, percent: Math.round((correct / total) * 100) }))
    .sort((a, b) => b.percent - a.percent);

  if (eligible.length === 0) return { strongType: null, weakType: null };
  if (eligible.length === 1) {
    const only = eligible[0];
    return only.percent >= 75 ? { strongType: only, weakType: null } : { strongType: null, weakType: only };
  }
  return { strongType: eligible[0], weakType: eligible[eligible.length - 1] };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDayLabel(date) {
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

// Activité des 7 derniers jours (aujourd'hui inclus), pour le graphique en
// barres du dashboard parent — questions répondues / bonnes réponses par jour.
export function dailyActivityLast7Days(sessions, { referenceDate = new Date() } = {}) {
  const ref = new Date(referenceDate);
  ref.setUTCHours(0, 0, 0, 0);
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(ref.getTime() - i * DAY_MS);
    days.push({
      dateKey: d.toISOString().slice(0, 10),
      dateLabel: formatDayLabel(d),
      correctCount: 0,
      questionsTotal: 0,
    });
  }
  const byKey = Object.fromEntries(days.map((d) => [d.dateKey, d]));
  sessions.forEach((session) => {
    const entry = byKey[session.date];
    if (!entry) return;
    entry.correctCount += session.correctCount ?? 0;
    entry.questionsTotal += session.questionsTotal ?? 0;
  });
  return days;
}

// Graphique SVG fait main (pas de librairie externe) : une barre claire pour
// le total de questions, une barre menthe superposée pour les bonnes réponses.
export function dailyActivityChartSvg(days, { width = 280, height = 110 } = {}) {
  const chartHeight = height - 18;
  const maxValue = Math.max(1, ...days.map((d) => d.questionsTotal));
  const barWidth = width / days.length;
  const barInnerWidth = barWidth * 0.6;
  const bars = days
    .map((d, i) => {
      const totalHeight = (d.questionsTotal / maxValue) * chartHeight;
      const correctHeight = (d.correctCount / maxValue) * chartHeight;
      const x = i * barWidth + (barWidth - barInnerWidth) / 2;
      return `
        <rect x="${x}" y="${chartHeight - totalHeight}" width="${barInnerWidth}" height="${totalHeight}" fill="#e5e0f5" rx="3" />
        <rect x="${x}" y="${chartHeight - correctHeight}" width="${barInnerWidth}" height="${correctHeight}" fill="#06d6a0" rx="3" />
        <text x="${x + barInnerWidth / 2}" y="${height - 2}" text-anchor="middle" font-size="9" fill="#6f7080">${d.dateLabel}</text>
      `;
    })
    .join('');
  return `<svg viewBox="0 0 ${width} ${height}" class="daily-chart-svg" role="img" aria-label="Activité des 7 derniers jours">${bars}</svg>`;
}

export function colorForPercent(percent) {
  if (percent === null) return '#e5e0f5'; // gris-mauve clair, "pas de données"
  if (percent < 50) return '#ffb4a2';
  if (percent < 75) return '#ffe5a0';
  return '#c8f0c8';
}

const NOTION_TYPES = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction', 'geometrie', 'monnaie', 'longueur', 'temps', 'probleme'];

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function rewardsSectionHtml(rewards, rewardRequests, coins) {
  const pending = rewardRequests.filter((r) => r.status === 'pending');
  const resolved = rewardRequests
    .filter((r) => r.status !== 'pending')
    .slice(0, 5);
  return `
    <section class="rewards">
      <h2>🎁 Récompenses réelles</h2>
      <p class="setup-hint">Solde de l'enfant : <strong>${coins ?? 0} 🪙</strong></p>

      <h3>Créer une récompense</h3>
      <form id="reward-form">
        <label>Nom<input id="reward-name" required /></label>
        <label>Coût en pièces<input id="reward-cost" type="number" min="1" step="1" required /></label>
        <button type="submit">Ajouter</button>
      </form>

      <h3>Récompenses disponibles</h3>
      ${
        rewards.length
          ? `<ul class="reward-list">${rewards
              .map((r) => `<li>${r.name} — ${r.cost} 🪙</li>`)
              .join('')}</ul>`
          : '<p class="setup-hint">Aucune récompense créée pour le moment.</p>'
      }

      <h3>Demandes en attente${pending.length ? ` (${pending.length})` : ''}</h3>
      ${
        pending.length
          ? `<ul class="reward-request-list">${pending
              .map(
                (r) => `
              <li class="reward-request" data-id="${r.id}">
                <span>${r.rewardName} — ${r.cost} 🪙</span>
                <button class="button-success reward-approve" data-id="${r.id}">Valider</button>
                <button class="button-danger reward-reject" data-id="${r.id}">Refuser</button>
              </li>`
              )
              .join('')}</ul>`
          : '<p class="setup-hint">Aucune demande en attente.</p>'
      }

      ${
        resolved.length
          ? `<h3>Historique récent</h3><ul class="reward-request-list">${resolved
              .map(
                (r) =>
                  `<li>${r.rewardName} — ${r.cost} 🪙 — ${r.status === 'approved' ? '✅ validée' : '❌ refusée'}</li>`
              )
              .join('')}</ul>`
          : ''
      }
    </section>
  `;
}

export function renderChildrenList(root, { children, onSelectChild, onAddChild, onSignOut, onCopyCode, onShareCode, error = null }) {
  root.innerHTML = `
    <div class="dashboard">
      <header>
        <h1>Mes enfants</h1>
        <button id="sign-out">Se déconnecter</button>
      </header>
      <section class="children-section">
        ${
          children.length
            ? `<ul class="children-list">${children
                .map(
                  (c) => `
                <li class="child-row">
                  <button class="child-select" data-id="${c.id}">${c.childName} — Niveau ${c.avatarLevel ?? 1}</button>
                  <span class="child-code">Code : <strong>${c.id}</strong></span>
                  <button class="link-button child-copy" data-id="${c.id}">Copier</button>
                  <button class="link-button child-share" data-id="${c.id}" data-name="${c.childName}">Partager</button>
                </li>`
                )
                .join('')}</ul>`
            : '<p class="setup-hint">Aucun enfant pour le moment. Ajoutez-en un ci-dessous.</p>'
        }
      </section>
      <section class="add-child">
        <h2>Ajouter un enfant</h2>
        <form id="add-child-form">
          <label>Prénom de l'enfant<input id="child-name" required /></label>
          <label>Code secret à 4 chiffres<input id="pin" type="password" inputmode="numeric" maxlength="4" required /></label>
          ${error ? '<p class="error" id="add-child-error"></p>' : ''}
          <button type="submit">Créer</button>
        </form>
      </section>
    </div>
  `;
  if (error) {
    root.querySelector('#add-child-error').textContent = error;
  }
  root.querySelector('#sign-out').addEventListener('click', onSignOut);
  root.querySelectorAll('.child-select').forEach((btn) =>
    btn.addEventListener('click', () => onSelectChild(btn.dataset.id))
  );
  root.querySelectorAll('.child-copy').forEach((btn) =>
    btn.addEventListener('click', () => onCopyCode(btn.dataset.id))
  );
  root.querySelectorAll('.child-share').forEach((btn) =>
    btn.addEventListener('click', () => onShareCode(btn.dataset.id, btn.dataset.name))
  );
  root.querySelector('#add-child-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const childName = root.querySelector('#child-name').value.trim();
    const pin = root.querySelector('#pin').value.trim();
    if (!childName || pin.length !== 4) return;
    onAddChild({ childName, pin });
  });
}

function insightCardsHtml({ strongType, weakType }) {
  if (!strongType && !weakType) {
    return '<p class="setup-hint">Pas encore assez de missions pour dégager une tendance.</p>';
  }
  return `
    <div class="insight-cards">
      ${
        strongType
          ? `<div class="insight-card insight-strong">
              <p class="insight-title">💪 Point fort</p>
              <p class="insight-body">${emojiForType(strongType.type)} ${capitalize(strongType.type)} — ${strongType.percent}% de réussite</p>
            </div>`
          : ''
      }
      ${
        weakType
          ? `<div class="insight-card insight-weak">
              <p class="insight-title">📚 À travailler</p>
              <p class="insight-body">${emojiForType(weakType.type)} ${capitalize(weakType.type)} — ${weakType.percent}% de réussite</p>
            </div>`
          : ''
      }
    </div>
  `;
}

function breakdownBarsHtml(breakdown, difficultyLevels) {
  const entries = Object.entries(breakdown);
  if (entries.length === 0) {
    return '<p class="setup-hint">Aucune mission réalisée pour le moment.</p>';
  }
  return `
    <ul class="breakdown-list">
      ${entries
        .map(([type, percent]) => {
          const level = difficultyLevels[type] ?? 1;
          return `
            <li class="breakdown-row">
              <span class="breakdown-label">${emojiForType(type)} ${capitalize(type)}</span>
              <span class="breakdown-bar"><span class="breakdown-bar-fill" style="width:${percent}%;background:${colorForPercent(percent)}"></span></span>
              <span class="breakdown-value">${percent}% — ${DIFFICULTY_LABELS[level]}</span>
            </li>`;
        })
        .join('')}
    </ul>
  `;
}

export function renderDashboard(root, { child, profile, sessions, rewards = [], rewardRequests = [], onBack, onSignOut, onSetFocus, onSetWeeklyGoal, onCreateReward, onResolveRequest, onCopyCode, onShareCode }) {
  const breakdown = aggregateBreakdown(sessions);
  const difficultyLevels = profile.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  const weeklyBreakdown = weeklyBreakdownByType(sessions);
  const weekLabels = Object.values(weeklyBreakdown)[0]?.map((w) => w.weekLabel) ?? [];
  const insights = computeInsights(sessions);
  const dailyActivity = dailyActivityLast7Days(sessions);
  root.innerHTML = `
    <div class="dashboard">
      <header>
        <button id="back-to-children" class="link-button">← Mes enfants</button>
        <h1>Tableau de bord — <span id="child-name"></span></h1>
        <p>
          Code d'appairage à entrer sur la tablette : <strong>${child.id}</strong>
          <button id="copy-code" class="link-button">Copier</button>
          <button id="share-code" class="link-button">Partager</button>
        </p>
        <button id="sign-out">Se déconnecter</button>
      </header>
      <section class="progress-summary">
        <p>Niveau ${profile.avatarLevel} — ${profile.xp} XP</p>
        <p>Série actuelle : ${profile.streakDays} jour${profile.streakDays > 1 ? 's' : ''}</p>
        ${renderBadgeMedallionsHtml(profile.badges)}
      </section>
      <section class="insights">
        <h2>En un coup d'œil</h2>
        ${insightCardsHtml(insights)}
      </section>
      <section class="breakdown">
        <h2>Réussite par notion</h2>
        ${breakdownBarsHtml(breakdown, difficultyLevels)}
      </section>
      <section class="daily-activity">
        <h2>Activité des 7 derniers jours</h2>
        ${dailyActivityChartSvg(dailyActivity)}
        <p class="setup-hint chart-legend"><span class="legend-swatch legend-swatch-total"></span> Questions posées <span class="legend-swatch legend-swatch-correct"></span> Bonnes réponses</p>
      </section>
      <section class="focus-selector">
        <h2>Missions ciblées &amp; objectif hebdomadaire</h2>
        <label>
          Notion à travailler en priorité
          <select id="focus-type">
            <option value="">Aucune (mélange habituel)</option>
            ${NOTION_TYPES.map(
              (t) =>
                `<option value="${t}" ${profile.focusType === t ? 'selected' : ''}>${emojiForType(t)} ${capitalize(t)}</option>`
            ).join('')}
          </select>
        </label>
        <p class="setup-hint">
          Cette semaine : ${
            profile.weeklyGoalWeekStart === weekStartKey(new Date().toISOString().slice(0, 10))
              ? profile.weeklyGoalProgress ?? 0
              : 0
          } / ${profile.weeklyGoalTarget ?? 0} mission${(profile.weeklyGoalTarget ?? 0) > 1 ? 's' : ''} réalisée${(profile.weeklyGoalTarget ?? 0) > 1 ? 's' : ''}
        </p>
        <form id="weekly-goal-form">
          <label>
            Objectif : nombre de missions cette semaine
            <input id="weekly-goal-target" type="number" min="0" step="1" value="${profile.weeklyGoalTarget ?? 0}" />
          </label>
          <button type="submit">Enregistrer l'objectif</button>
        </form>
      </section>
      <section class="weekly-progress">
        <h2>Évolution par semaine</h2>
        <table class="weekly-progress-table">
          <thead>
            <tr>
              <th></th>
              ${weekLabels.map((label) => `<th>${label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${Object.entries(weeklyBreakdown)
              .map(
                ([type, weeks]) => `
              <tr>
                <td>${emojiForType(type)}</td>
                ${weeks
                  .map(
                    (w) =>
                      `<td style="background:${colorForPercent(w.percent)}">${w.percent === null ? '' : w.percent + '%'}</td>`
                  )
                  .join('')}
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </section>
      <section class="sessions">
        <h2>Sessions récentes</h2>
        <ul>
          ${sessions
            .map(
              (s) =>
                `<li>${s.date} — ${s.correctCount}/${s.questionsTotal} en ${Math.round(s.durationSeconds / 60)} min</li>`
            )
            .join('')}
        </ul>
      </section>
      ${rewardsSectionHtml(rewards, rewardRequests, profile.coins)}
    </div>
  `;
  root.querySelector('#child-name').textContent = profile.childName;
  root.querySelector('#sign-out').addEventListener('click', onSignOut);
  root.querySelector('#back-to-children').addEventListener('click', onBack);
  root.querySelector('#copy-code').addEventListener('click', () => onCopyCode(child.id));
  root.querySelector('#share-code').addEventListener('click', () => onShareCode(child.id, profile.childName));
  root.querySelector('#focus-type').addEventListener('change', (event) => onSetFocus(event.target.value || null));
  root.querySelector('#weekly-goal-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const target = Number(root.querySelector('#weekly-goal-target').value);
    if (Number.isNaN(target) || target < 0) return;
    onSetWeeklyGoal(target);
  });
  root.querySelector('#reward-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = root.querySelector('#reward-name').value.trim();
    const cost = Number(root.querySelector('#reward-cost').value);
    if (!name || !cost || cost < 1) return;
    onCreateReward({ name, cost });
  });
  root.querySelectorAll('.reward-approve').forEach((btn) =>
    btn.addEventListener('click', () => onResolveRequest(btn.dataset.id, 'approved'))
  );
  root.querySelectorAll('.reward-reject').forEach((btn) =>
    btn.addEventListener('click', () => onResolveRequest(btn.dataset.id, 'rejected'))
  );
}
