import { BADGES, renderBadgeMedallionsHtml } from '../shared/badges.js';
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

  const buckets = {}; // weekLabel -> { type -> { correct, total } }
  weekStarts.forEach((weekStart) => {
    buckets[formatWeekLabel(weekStart)] = {};
  });

  sessions.forEach((session) => {
    const sessionWeekStart = startOfWeek(new Date(session.date));
    const label = formatWeekLabel(sessionWeekStart);
    if (!(label in buckets)) return; // hors de la fenêtre des weekCount semaines
    Object.entries(session.breakdown).forEach(([type, { correct, total }]) => {
      if (!buckets[label][type]) buckets[label][type] = { correct: 0, total: 0 };
      buckets[label][type].correct += correct;
      buckets[label][type].total += total;
    });
  });

  const result = {};
  types.forEach((type) => {
    result[type] = weekStarts.map((weekStart) => {
      const label = formatWeekLabel(weekStart);
      const entry = buckets[label][type];
      return {
        weekLabel: label,
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

function emojiForType(type) {
  const badge = BADGES.find((b) => b.id === `mastery-${type}`);
  return badge ? badge.emoji : '❓';
}

export function renderDashboard(root, { family, profile, sessions, onSignOut }) {
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
}
