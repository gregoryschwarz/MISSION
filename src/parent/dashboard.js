import { emojiForType, renderBadgeMedallionsHtml } from '../shared/badges.js';
import { DIFFICULTY_LABELS, DEFAULT_DIFFICULTY_LEVELS } from '../shared/difficulty.js';
import { weekStartKey } from '../shared/progression.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

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

export function computeWeeklyWatch(sessions, profile, { referenceDate = new Date() } = {}) {
  const ref = new Date(referenceDate);
  ref.setUTCHours(0, 0, 0, 0);

  const sessionDates = sessions
    .map((session) => session.date)
    .filter(Boolean)
    .sort();

  const latestDate =
    sessionDates.length > 0
      ? sessionDates[sessionDates.length - 1]
      : profile.lastSessionDate ?? null;

  let daysSinceLastActivity = null;
  let lastActivityLabel = 'Aucune activité enregistrée';

  if (latestDate) {
    const latest = new Date(`${latestDate}T00:00:00Z`);
    daysSinceLastActivity = Math.max(
      0,
      Math.round((ref.getTime() - latest.getTime()) / DAY_MS)
    );

    if (daysSinceLastActivity === 0) {
      lastActivityLabel = "Aujourd'hui";
    } else if (daysSinceLastActivity === 1) {
      lastActivityLabel = 'Hier';
    } else {
      lastActivityLabel = `Il y a ${daysSinceLastActivity} jours`;
    }
  }

  const currentWeek = weekStartKey(ref.toISOString().slice(0, 10));
  const weeklyTarget = profile.weeklyGoalTarget ?? 0;
  const weeklyProgress =
    profile.weeklyGoalWeekStart === currentWeek
      ? profile.weeklyGoalProgress ?? 0
      : 0;

  const { weakType } = computeInsights(sessions);
  const focusType = profile.focusType ?? null;

  let status = 'ok';
  let statusLabel = 'RAS';

  if (
    daysSinceLastActivity === null ||
    daysSinceLastActivity >= 3 ||
    (weakType && weakType.percent < 50)
  ) {
    status = 'attention';
    statusLabel = 'À travailler';
  } else if (
    (weeklyTarget > 0 && weeklyProgress < weeklyTarget) ||
    (weakType && weakType.percent < 75)
  ) {
    status = 'encourage';
    statusLabel = 'À encourager';
  }

  return {
    lastActivityLabel,
    daysSinceLastActivity,
    weeklyProgress,
    weeklyTarget,
    weakType,
    focusType,
    status,
    statusLabel,
  };
}

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
        <label>Icône<input id="reward-emoji" maxlength="4" value="🎁" /></label>
        <label>Nom<input id="reward-name" required /></label>
        <label>Coût en pièces<input id="reward-cost" type="number" min="1" step="1" required /></label>
        <button type="submit">Ajouter</button>
      </form>

      <h3>Récompenses disponibles</h3>
      ${
        rewards.length
          ? `<ul class="reward-list editable-reward-list">${rewards
              .map((r) => `<li class="reward-edit-row ${r.active === false ? 'reward-inactive' : ''}" data-id="${r.id}">
                <input class="reward-edit-emoji" value="${escapeHtml(r.emoji ?? '🎁')}" maxlength="4" aria-label="Icône" />
                <input class="reward-edit-name" value="${escapeHtml(r.name)}" maxlength="80" aria-label="Nom de la récompense" />
                <input class="reward-edit-cost" type="number" min="1" step="1" value="${r.cost}" aria-label="Coût en pièces" />
                <span>🪙</span><button class="reward-update" data-id="${r.id}">Enregistrer</button>
                <button class="reward-toggle" data-id="${r.id}" data-active="${r.active !== false}">${r.active === false ? 'Réactiver' : 'Désactiver'}</button>
                <button class="reward-archive ${r.archived ? '' : 'button-danger'}" data-id="${r.id}" data-archived="${!!r.archived}">${r.archived ? 'Restaurer' : 'Archiver'}</button>
              </li>`)
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
                <span>${escapeHtml(r.rewardName)} — ${r.cost} 🪙</span>
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
                  `<li>${escapeHtml(r.rewardName)} — ${r.cost} 🪙 — ${r.status === 'approved' ? '✅ validée' : '❌ refusée'}</li>`
              )
              .join('')}</ul>`
          : ''
      }
    </section>
  `;
}

export function renderPairingRequestsSection(root, pairingRequests, onResolvePairing) {
  const section = root.querySelector('.pairing-requests');
  if (!section) return;
  section.innerHTML = `
    <h2>Tablettes à autoriser${pairingRequests.length ? ` (${pairingRequests.length})` : ''}</h2>
    ${pairingRequests.length
      ? `<ul class="children-list">${pairingRequests.map((request) => `
          <li class="child-row">
            <span>Autoriser une tablette pour <strong>${escapeHtml(request.childName)}</strong> ?
              ${request.replacesDevice ? '<strong class="error">Cette autorisation remplacera la tablette actuelle.</strong>' : ''}
            </span>
            <button class="button-success pairing-approve" data-child-id="${request.childId}" data-device-uid="${request.requesterUid}">Autoriser</button>
            <button class="button-danger pairing-reject" data-child-id="${request.childId}" data-device-uid="${request.requesterUid}">Refuser</button>
          </li>`).join('')}</ul>`
      : '<p class="setup-hint">Aucune demande en attente — vérification automatique active.</p>'}
  `;
  section.querySelectorAll('.pairing-approve').forEach((btn) =>
    btn.addEventListener('click', () => onResolvePairing(btn.dataset.childId, btn.dataset.deviceUid, 'approved'))
  );
  section.querySelectorAll('.pairing-reject').forEach((btn) =>
    btn.addEventListener('click', () => onResolvePairing(btn.dataset.childId, btn.dataset.deviceUid, 'rejected'))
  );
}

export function dailyBreakdownByType(sessions, { dayCount = 7, referenceDate = new Date() } = {}) {
  const referenceDay = new Date(referenceDate);
  referenceDay.setUTCHours(0, 0, 0, 0);
  const days = [];
  for (let i = dayCount - 1; i >= 0; i -= 1) {
    days.push(new Date(referenceDay.getTime() - i * 24 * 60 * 60 * 1000));
  }
  const types = new Set();
  sessions.forEach((session) => Object.keys(session.breakdown ?? {}).forEach((type) => types.add(type)));
  const buckets = Object.fromEntries(days.map((day) => [formatBucketKey(day), {}]));
  sessions.forEach((session) => {
    const bucket = buckets[session.date];
    if (!bucket) return;
    Object.entries(session.breakdown ?? {}).forEach(([type, { correct, total }]) => {
      if (!bucket[type]) bucket[type] = { correct: 0, total: 0 };
      bucket[type].correct += correct;
      bucket[type].total += total;
    });
  });
  const dayNames = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
  return Object.fromEntries([...types].map((type) => [
    type,
    days.map((day) => {
      const entry = buckets[formatBucketKey(day)][type];
      return {
        dayLabel: `${dayNames[day.getUTCDay()]} ${formatWeekLabel(day)}`,
        percent: entry?.total > 0 ? Math.round((entry.correct / entry.total) * 100) : null,
      };
    }),
  ]));
}

function monthlyCalendarHtml(sessions, referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7;
  const counts = {};
  sessions.forEach((session) => { counts[session.date] = (counts[session.date] ?? 0) + 1; });
  const cells = Array.from({ length: leading }, () => '<span class="calendar-day empty"></span>');
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const count = counts[key] ?? 0;
    cells.push(`<span class="calendar-day ${count ? 'active' : ''}"><b>${day}</b>${count ? `<small>${count} mission${count > 1 ? 's' : ''}</small>` : ''}</span>`);
  }
  return `<div class="monthly-calendar"><div class="calendar-weekdays">${['L','M','M','J','V','S','D'].map((d) => `<b>${d}</b>`).join('')}</div><div class="calendar-grid">${cells.join('')}</div></div>`;
}

export function renderChildrenList(root, { children, pairingRequests = [], onSelectChild, onAddChild, onResolvePairing, onRevokeDevice, onSignOut, onCopyCode, onShareCode, error = null }) {
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
                  <button class="child-select" data-id="${c.id}">${escapeHtml(c.childName)} — Niveau ${c.avatarLevel ?? 1}</button>
                  <span class="child-code">Code : <strong>${c.pairingCode}</strong></span>
                  <button class="link-button child-copy" data-code="${c.pairingCode}">Copier</button>
                  <button class="link-button child-share" data-code="${c.pairingCode}" data-name="${escapeHtml(c.childName)}">Partager</button>
                  <span class="setup-hint">${c.deviceUid ? 'Tablette autorisée ✅' : 'Aucune tablette autorisée'}</span>
                  ${c.deviceUid ? `<button class="button-danger device-revoke" data-id="${c.id}" data-name="${escapeHtml(c.childName)}">Révoquer</button>` : ''}
                </li>`
                )
                .join('')}</ul>`
            : '<p class="setup-hint">Aucun enfant pour le moment. Ajoutez-en un ci-dessous.</p>'
        }
      </section>
      <section class="pairing-requests"></section>
      <section class="add-child">
        <h2>Ajouter un enfant</h2>
        <form id="add-child-form">
          <label>Prénom de l'enfant<input id="child-name" required /></label>
          ${error ? '<p class="error" id="add-child-error"></p>' : ''}
          <button type="submit">Créer</button>
        </form>
      </section>
    </div>
  `;
  if (error) {
    root.querySelector('#add-child-error').textContent = error;
  }
  renderPairingRequestsSection(root, pairingRequests, onResolvePairing);
  root.querySelector('#sign-out').addEventListener('click', onSignOut);
  root.querySelectorAll('.child-select').forEach((btn) =>
    btn.addEventListener('click', () => onSelectChild(btn.dataset.id))
  );
  root.querySelectorAll('.child-copy').forEach((btn) =>
    btn.addEventListener('click', () => onCopyCode(btn.dataset.code))
  );
  root.querySelectorAll('.child-share').forEach((btn) =>
    btn.addEventListener('click', () => onShareCode(btn.dataset.code, btn.dataset.name))
  );
  root.querySelectorAll('.device-revoke').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (window.confirm(`Révoquer la tablette de ${btn.dataset.name} ? Elle devra être autorisée à nouveau.`)) {
        onRevokeDevice(btn.dataset.id);
      }
    })
  );
  root.querySelector('#add-child-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const childName = root.querySelector('#child-name').value.trim();
    if (!childName) return;
    onAddChild({ childName });
  });
}


function weeklyWatchHtml(watch) {
  const weakLabel = watch.weakType
    ? `${emojiForType(watch.weakType.type)} ${capitalize(watch.weakType.type)} · ${watch.weakType.percent}%`
    : 'Pas assez de données';

  const focusLabel = watch.focusType
    ? `${emojiForType(watch.focusType)} ${capitalize(watch.focusType)}`
    : 'Aucune priorité';

  const goalLabel =
    watch.weeklyTarget > 0
      ? `${watch.weeklyProgress}/${watch.weeklyTarget} missions`
      : 'Aucun objectif fixé';

  return `
    <section class="weekly-watch weekly-watch-${watch.status}">
      <div class="weekly-watch-header">
        <div>
          <h2>👀 À surveiller cette semaine</h2>
          <p class="setup-hint">Synthèse automatique des dernières missions.</p>
        </div>
        <span class="weekly-watch-status">${escapeHtml(watch.statusLabel)}</span>
      </div>

      <div class="weekly-watch-grid">
        <div class="weekly-watch-item">
          <span>Dernière activité</span>
          <strong>${escapeHtml(watch.lastActivityLabel)}</strong>
        </div>

        <div class="weekly-watch-item">
          <span>Objectif semaine</span>
          <strong>${escapeHtml(goalLabel)}</strong>
        </div>

        <div class="weekly-watch-item">
          <span>Notion à surveiller</span>
          <strong>${escapeHtml(weakLabel)}</strong>
        </div>

        <div class="weekly-watch-item">
          <span>Priorité parent</span>
          <strong>${escapeHtml(focusLabel)}</strong>
        </div>
      </div>

      ${
        watch.weakType && watch.focusType !== watch.weakType.type
          ? `<button
               type="button"
               class="weekly-watch-focus-button"
               data-focus-type="${escapeHtml(watch.weakType.type)}"
             >Cibler ${escapeHtml(capitalize(watch.weakType.type))}</button>`
          : ''
      }
    </section>
  `;
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

export function renderDashboard(root, { child, profile, sessions, rewards = [], rewardRequests = [], onBack, onSignOut, onSetFocus, onSetWeeklyGoal, onSetDailyLimit, onCreateReward, onUpdateReward, onResolveRequest, onCopyCode, onShareCode, onEnableNotifications }) {
  const breakdown = aggregateBreakdown(sessions);
  const difficultyLevels = profile.difficultyLevels ?? DEFAULT_DIFFICULTY_LEVELS;
  const dailyBreakdown = dailyBreakdownByType(sessions);
  const dayLabels = Object.values(dailyBreakdown)[0]?.map((day) => day.dayLabel) ?? [];
  const insights = computeInsights(sessions);
  const dailyActivity = dailyActivityLast7Days(sessions);
  const weeklyWatch = computeWeeklyWatch(sessions, profile);
  root.innerHTML = `
    <div class="dashboard">
      <header>
        <button id="back-to-children" class="link-button">← Mes enfants</button>
        <h1>Tableau de bord — <span id="child-name"></span></h1>
        <p>
          Code d'appairage à entrer sur la tablette : <strong>${child.pairingCode}</strong>
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
      ${weeklyWatchHtml(weeklyWatch)}
      <section class="insights">
        <h2>En un coup d'œil</h2>
        ${insightCardsHtml(insights)}
        ${insights.weakType ? `<div class="recommendation-card">💡 Suggestion : proposer une mission « ${escapeHtml(capitalize(insights.weakType.type))} » (${insights.weakType.percent}% de réussite).</div>` : '<div class="recommendation-card">💡 Continue quelques missions pour obtenir une recommandation personnalisée.</div>'}
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
          <label>
            Récompense gratuite si l’objectif est atteint
            <input id="weekly-reward-text" type="text" maxlength="120" value="${escapeHtml(profile.weeklyRewardText ?? 'Vendredi et samedi soir : tu peux rester debout plus tard !')}" />
          </label>
          <fieldset class="reward-days"><legend>Jours du bonus</legend>${['vendredi','samedi','dimanche'].map((day) => `<label><input type="checkbox" name="reward-day" value="${day}" ${(profile.weeklyRewardDays ?? ['vendredi','samedi']).includes(day) ? 'checked' : ''} /> ${capitalize(day)}</label>`).join('')}</fieldset>
          <button type="submit">Enregistrer l'objectif</button>
        </form>
        <form id="daily-limit-form">
          <label>Limite de missions par jour (0 = sans limite)<input id="daily-mission-limit" type="number" min="0" max="20" step="1" value="${profile.dailyMissionLimit ?? 3}" /></label>
          <button type="submit">Enregistrer la limite</button>
        </form>
      </section>
      <section class="notification-settings"><button id="enable-notifications">🔔 Activer les alertes de récompenses</button><p class="setup-hint">L’espace parent vérifiera les nouvelles demandes toutes les 10 secondes.</p></section>
      <section class="monthly-activity"><h2>Calendrier du mois</h2>${monthlyCalendarHtml(sessions)}</section>
      <section class="weekly-progress">
        <h2>Évolution des 7 derniers jours</h2>
        <table class="weekly-progress-table">
          <thead>
            <tr>
              <th></th>
              ${dayLabels.map((label) => `<th>${label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${Object.entries(dailyBreakdown)
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
  root.querySelector('#copy-code').addEventListener('click', () => onCopyCode(child.pairingCode));
  root.querySelector('#share-code').addEventListener('click', () => onShareCode(child.pairingCode, profile.childName));
  root.querySelector('#enable-notifications').addEventListener('click', onEnableNotifications);
  root.querySelector('#focus-type').addEventListener('change', (event) => onSetFocus(event.target.value || null));

  root.querySelector('.weekly-watch-focus-button')?.addEventListener('click', (event) => {
    const type = event.currentTarget.dataset.focusType;
    if (!type) return;
    onSetFocus(type);
  });
  root.querySelector('#weekly-goal-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const target = Number(root.querySelector('#weekly-goal-target').value);
    const rewardText = root.querySelector('#weekly-reward-text').value.trim();
    const rewardDays = [...root.querySelectorAll('input[name="reward-day"]:checked')].map((input) => input.value);
    if (Number.isNaN(target) || target < 0) return;
    if (target > 0 && !rewardText) return;
    onSetWeeklyGoal({ target, rewardText, rewardDays });
  });
  root.querySelector('#daily-limit-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const limit = Number(root.querySelector('#daily-mission-limit').value);
    if (!Number.isInteger(limit) || limit < 0 || limit > 20) return;
    onSetDailyLimit(limit);
  });
  root.querySelector('#reward-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = root.querySelector('#reward-name').value.trim();
    const emoji = root.querySelector('#reward-emoji').value.trim() || '🎁';
    const cost = Number(root.querySelector('#reward-cost').value);
    if (!name || !cost || cost < 1) return;
    onCreateReward({ name, cost, emoji });
  });
  root.querySelectorAll('.reward-update').forEach((button) => button.addEventListener('click', () => {
    const row = button.closest('.reward-edit-row');
    const name = row.querySelector('.reward-edit-name').value.trim();
    const emoji = row.querySelector('.reward-edit-emoji').value.trim() || '🎁';
    const cost = Number(row.querySelector('.reward-edit-cost').value);
    if (!name || !Number.isInteger(cost) || cost < 1) return;
    onUpdateReward(button.dataset.id, { name, cost, emoji });
  }));
  root.querySelectorAll('.reward-toggle').forEach((button) => button.addEventListener('click', () => {
    onUpdateReward(button.dataset.id, { active: button.dataset.active !== 'true' });
  }));
  root.querySelectorAll('.reward-archive').forEach((button) => button.addEventListener('click', () => {
    const restore = button.dataset.archived === 'true';
    onUpdateReward(button.dataset.id, { active: restore, archived: !restore });
  }));
  root.querySelectorAll('.reward-approve').forEach((btn) =>
    btn.addEventListener('click', () => onResolveRequest(btn.dataset.id, 'approved'))
  );
  root.querySelectorAll('.reward-reject').forEach((btn) =>
    btn.addEventListener('click', () => onResolveRequest(btn.dataset.id, 'rejected'))
  );
}
