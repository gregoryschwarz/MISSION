import { emojiForType, renderBadgeMedallionsHtml } from '../shared/badges.js';
import { DIFFICULTY_LABELS, DEFAULT_DIFFICULTY_LEVELS } from '../shared/difficulty.js';

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

export function renderDashboard(root, { family, profile, sessions, onSignOut, onSetFocus }) {
  const breakdown = aggregateBreakdown(sessions);
  const difficultyLevels = profile.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  const weeklyBreakdown = weeklyBreakdownByType(sessions);
  const weekLabels = Object.values(weeklyBreakdown)[0]?.map((w) => w.weekLabel) ?? [];
  root.innerHTML = `
    <div class="dashboard">
      <header>
        <h1>Tableau de bord — <span id="child-name"></span></h1>
        <p>Code d'appairage à entrer sur la tablette : <strong>${family.id}</strong></p>
        <button id="sign-out">Se déconnecter</button>
      </header>
      <section class="progress-summary">
        <p>Niveau ${profile.avatarLevel} — ${profile.xp} XP</p>
        <p>Série actuelle : ${profile.streakDays} jour${profile.streakDays > 1 ? 's' : ''}</p>
        ${renderBadgeMedallionsHtml(profile.badges)}
      </section>
      <section class="breakdown">
        <h2>Réussite par notion</h2>
        <ul>
          ${Object.entries(breakdown)
            .map(([type, percent]) => {
              const level = difficultyLevels[type] ?? 1;
              return `<li>${type} : ${percent}% — ${DIFFICULTY_LABELS[level]}</li>`;
            })
            .join('')}
        </ul>
      </section>
      <section class="focus-selector">
        <h2>Priorité de révision</h2>
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
    </div>
  `;
  root.querySelector('#child-name').textContent = profile.childName;
  root.querySelector('#sign-out').addEventListener('click', onSignOut);
  root.querySelector('#focus-type').addEventListener('change', (event) => onSetFocus(event.target.value || null));
}
