# Vue de progression parent

**Date :** 2026-08-05
**Statut :** Approuvé pour planification

## Contexte et objectif

Sous-projet 4 sur 4 (dernier) d'une série de retours utilisateur (après badges de maîtrise, nouveaux types de questions, et personnalisation de l'avatar, tous livrés et déployés). Le tableau de bord parent (`src/parent/dashboard.js`) affiche aujourd'hui un état instantané : XP, niveau, série de jours, badges obtenus, et un % de réussite global par notion (toutes sessions confondues). Il n'existe aucune vue de l'évolution dans le temps — un parent ne peut pas voir si une notion s'améliore, stagne, ou régresse au fil des semaines.

Ce sous-projet ajoute une vue de progression hebdomadaire par notion, sous forme de tableau chaleur (cases colorées), en s'appuyant uniquement sur les données déjà collectées par mission (aucun nouveau champ Firestore, aucun changement côté enfant).

Le mode "Contre-la-montre" reste explicitement hors périmètre. C'est le dernier sous-projet de cette série.

## Périmètre

- **Nouvelle section** sur le tableau de bord parent, ajoutée après la section "Réussite par notion" existante (qui reste inchangée) : un tableau chaleur montrant, pour chaque notion déjà pratiquée, le % de réussite semaine par semaine sur une **fenêtre glissante des 8 dernières semaines** (semaines calendaires lundi–dimanche, se terminant à la semaine courante).
- **Cases colorées** selon 3 paliers façon feu tricolore : <50% rouge doux, 50–74% orange/jaune, ≥75% vert.
- **Semaine sans mission pour une notion donnée** → case grise "pas de données", distincte visuellement d'un mauvais score.
- **Icône par notion** : réutilisation des emojis déjà définis pour les badges de maîtrise dans `src/shared/badges.js` (➕ ➖ ✖️ ⚖️ ➗ 🍕) — une seule source de vérité pour l'emoji d'une notion dans toute l'app.
- **Notions affichées** : mêmes notions que celles déjà listées dans la section "Réussite par notion" existante (dynamique — seulement les notions effectivement pratiquées par l'enfant, pas les 6 du catalogue par défaut).

**Hors périmètre** : graphiques en courbes (SVG/canvas), export de données, sélection d'une fenêtre temporelle personnalisée par le parent, historique au-delà de 8 semaines, mode "Contre-la-montre".

## Détails techniques

### `src/parent/dashboard.js` — nouvelles fonctions pures

```js
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
```

`weeklyBreakdownByType` réutilise le même principe que `aggregateBreakdown` déjà en place (accumulation `correct`/`total` par notion), en ajoutant le regroupement par semaine. `referenceDate` est injectable pour la testabilité (par défaut `new Date()`, comme le reste de l'orchestration du projet gère déjà le temps réel). Les dates de session sont des chaînes `'YYYY-MM-DD'` (déjà produites par `finishSession` dans `src/child/session.js`), interprétées en UTC pour rester cohérentes avec la façon dont elles sont générées (`toISOString().slice(0, 10)`).

### `src/parent/dashboard.js` — rendu

Import de `BADGES` depuis `../shared/badges.js` pour résoudre l'emoji d'une notion :

```js
function emojiForType(type) {
  const badge = BADGES.find((b) => b.id === `mastery-${type}`);
  return badge ? badge.emoji : '❓';
}
```

Dans `renderDashboard`, après la section `breakdown` existante, nouvelle section :

```js
const weeklyBreakdown = weeklyBreakdownByType(sessions);
const weekLabels = Object.values(weeklyBreakdown)[0]?.map((w) => w.weekLabel) ?? [];
```

```js
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
```

`weekLabels` est dérivé du premier type disponible dans `weeklyBreakdown` (tous les types partagent les mêmes 8 `weekLabel`, par construction de `weeklyBreakdownByType`). Si `weeklyBreakdown` est vide (aucune session), la section n'affiche qu'un tableau sans lignes — cohérent avec le comportement actuel de la section "Réussite par notion" quand `sessions` est vide.

### CSS (`src/parent/style.css`)

Nouvelle règle pour `.weekly-progress-table` (bordures fines, cellules centrées, largeur fixe par colonne) — pas de nouvelle palette de couleurs à définir ailleurs, les couleurs sont déjà des valeurs inline via `colorForPercent`.

## Gestion des erreurs

Aucune nouvelle surface d'erreur réseau : la fonction opère uniquement sur les `sessions` déjà chargées par `fetchSessions` (aucun nouvel appel Firestore). Si `sessions` est vide ou si une session a un `breakdown` vide, `weeklyBreakdownByType` retourne un objet vide ou des semaines à `percent: null` — pas de cas d'erreur à gérer explicitement.

## Tests

Tests Vitest sur `weeklyBreakdownByType` :
- Regroupe correctement des sessions dans la bonne semaine (lundi–dimanche), y compris aux limites (dimanche vs lundi suivant).
- Une semaine sans session pour une notion donnée retourne `percent: null` pour cette notion.
- Fenêtre de 8 semaines calculée correctement par rapport à une `referenceDate` injectée (semaine la plus ancienne = 7 semaines avant la semaine de `referenceDate`, semaine la plus récente = semaine de `referenceDate`).
- Sessions hors fenêtre (plus vieilles que 8 semaines) sont ignorées.
- Plusieurs sessions dans la même semaine pour la même notion sont agrégées (somme de `correct`/`total`, comme `aggregateBreakdown`).
- Notions différentes retournent des tableaux de 8 entrées indépendants.

Tests Vitest sur `colorForPercent` :
- `null` → couleur "pas de données".
- Bornes exactes des 3 paliers (49% vs 50%, 74% vs 75%).

Pas de test pour le rendu HTML (`renderDashboard`), cohérent avec le reste du projet (vérifié manuellement).

## Déploiement

Même processus que les fonctionnalités précédentes : `npm run build` puis `firebase deploy --only hosting`. Aucun changement de règles Firestore, aucun changement côté enfant.
