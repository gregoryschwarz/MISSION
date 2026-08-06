# Révision ciblée

**Date :** 2026-08-06
**Statut :** Approuvé pour planification

## Contexte et objectif

Le tableau de bord parent (`src/parent/dashboard.js`) affiche depuis peu une heat-map hebdomadaire par notion (addition, soustraction, multiplication, comparaison, division, fraction), qui permet à un parent de repérer une notion faible. Cette information reste aujourd'hui purement informative : il n'existe aucun moyen d'agir dessus. La génération de mission (`generateMission` dans `src/child/questions.js`) produit toujours un mélange égal des 6 notions (round-robin), quel que soit l'état de l'enfant.

Ce sous-projet permet au parent de désigner une notion « prioritaire ». Les missions suivantes de l'enfant seront alors majoritairement composées de cette notion, jusqu'à ce que le parent change ou retire cette priorité. L'adaptation automatique de la difficulté par notion (`src/shared/difficulty.js`) n'est pas modifiée : la notion prioritaire garde son niveau de difficulté déjà calculé.

## Périmètre

- **Nouveau champ de profil** : `focusType` (`string | null`), une des 6 notions connues, ou `null` (comportement actuel, mélange égal).
- **Tableau de bord parent** : nouveau sélecteur « Notion à travailler en priorité » (les 6 notions + une option « Aucune »). Le changement est enregistré immédiatement dans Firestore, sans bouton de validation séparé.
- **Génération de mission** : quand une `focusType` est définie, ~70% des questions de la mission portent sur cette notion, le reste continue de tourner sur les 5 autres notions (round-robin), pour ne pas faire disparaître complètement les autres notions de la pratique quotidienne.
- **Écran d'accueil enfant** : petit message d'encouragement si une priorité est active (« 🎯 Aujourd'hui, on s'entraîne sur la division ! »), pour que l'enfant comprenne pourquoi une notion revient plus souvent, sans transformer cela en contrainte visible ou en écran de configuration.

**Hors périmètre** : historique des priorités passées, priorité multiple (plusieurs notions à la fois), notification push, changement du calcul de difficulté.

## Détails techniques

### `src/child/questions.js` — `generateMission`

Nouveau 3ᵉ paramètre optionnel `focusType = null` :

```js
const FOCUS_RATIO = 0.7;

export function generateMission(count = 10, difficultyLevels = DEFAULT_DIFFICULTY_LEVELS, focusType = null) {
  const types = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction'];
  const hasFocus = focusType && types.includes(focusType);
  const focusCount = hasFocus ? Math.round(count * FOCUS_RATIO) : 0;
  const otherTypes = hasFocus ? types.filter((t) => t !== focusType) : types;
  const questions = [];
  for (let i = 0; i < count; i++) {
    const type = i < focusCount ? focusType : otherTypes[(i - focusCount) % otherTypes.length];
    const level = difficultyLevels[type] ?? 1;
    questions.push(GENERATORS[type](level));
  }
  return shuffle(questions);
}
```

Quand `focusType` est `null`/absent/inconnu, `hasFocus` est `false`, `focusCount` vaut `0` et `otherTypes` contient les 6 types dans l'ordre habituel : le comportement (et les tests existants) reste inchangé bit pour bit.

### `src/parent/family.js` — écriture de la priorité

```js
export async function setFocusType(familyId, focusType) {
  await setDoc(doc(db, 'families', familyId, 'profile', 'data'), { focusType }, { merge: true });
}
```

`createFamily` initialise `focusType: null` dans le document de profil créé, par cohérence avec les autres champs par défaut (`difficultyLevels`, `selectedCharacter`, ...). Aucun changement de `firestore.rules` : la règle `profile/{docId}` autorise déjà `allow write: if request.auth != null;`.

### `src/parent/dashboard.js` — sélecteur

Nouvelle section après « Réussite par notion » :

```js
const NOTION_TYPES = ['addition', 'soustraction', 'multiplication', 'comparaison', 'division', 'fraction'];

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
```

```html
<section class="focus-selector">
  <h2>Priorité de révision</h2>
  <label>
    Notion à travailler en priorité
    <select id="focus-type">
      <option value="">Aucune (mélange habituel)</option>
      ${NOTION_TYPES.map(
        (t) => `<option value="${t}" ${profile.focusType === t ? 'selected' : ''}>${emojiForType(t)} ${capitalize(t)}</option>`
      ).join('')}
    </select>
  </label>
</section>
```

`renderDashboard` reçoit un nouveau champ `onSetFocus` dans ses options ; le `change` du `<select>` appelle `onSetFocus(event.target.value || null)`.

### `src/parent/main.js` — orchestration

`loadDashboard` construit `onSetFocus` comme une fermeture qui écrit puis recharge le tableau de bord (même famille déjà connue dans la portée) :

```js
onSetFocus: async (focusType) => {
  await setFocusType(family.id, focusType);
  await loadDashboard(parentUid);
},
```

### `src/child/ui.js` / `src/child/main.js` — message d'accueil

`renderHome` reçoit un nouveau champ `focusType`. Si non nul, un paragraphe est ajouté juste après le `<h1>`, avec un libellé français par notion (`FOCUS_LABELS`, une notion → un groupe nominal correct : « la division », « les fractions », etc.) :

```js
const FOCUS_LABELS = {
  addition: "l'addition",
  soustraction: 'la soustraction',
  multiplication: 'la multiplication',
  comparaison: 'la comparaison',
  division: 'la division',
  fraction: 'les fractions',
};
```

`main.js` passe `focusType: lastProfile?.focusType ?? null` à `renderHomeScreen`, et `lastProfile?.focusType ?? null` à `generateMission` dans `startMission`.

### CSS

`.focus-banner` dans `src/child/style.css` (texte centré, léger encart coloré, cohérent avec `.pause-reminder` déjà existant). `.focus-selector select` dans `src/parent/style.css` (style de formulaire simple, cohérent avec les champs existants).

## Gestion des erreurs

`setFocusType` peut échouer (réseau) comme n'importe quelle écriture Firestore parent existante (`handleSelectCharacter`/`handleSelectAccessory` côté enfant n'ont pas de gestion d'erreur dédiée non plus — le point de référence ici est `loadDashboard`, qui affiche déjà un écran d'erreur générique si le chargement échoue). Pas de nouvelle surface d'erreur à gérer explicitement : un échec d'écriture laisse simplement le tableau de bord dans son état précédent après le rechargement raté (même comportement que les autres écritures de profil du projet).

## Tests

Tests Vitest sur `generateMission` (ajoutés à `tests/child/questions.test.js`) :
- Sans `focusType` (ou `focusType` inconnu) : comportement identique aux tests existants (mélange égal round-robin).
- Avec un `focusType` valide et `count = 10` : exactement 7 questions de ce type, les 3 restantes cyclent sur les 5 autres types dans l'ordre du catalogue.
- Le niveau de difficulté de la notion prioritaire est bien transmis à son générateur.

Pas de test pour `setFocusType` (écriture Firestore, cohérent avec le reste de `family.js`, jamais testé unitairement) ni pour le rendu HTML (`renderDashboard`, `renderHome`), cohérent avec le reste du projet.

## Déploiement

Même processus que les fonctionnalités précédentes : `npm run build` puis `firebase deploy --only hosting`. Aucun changement de règles Firestore.
