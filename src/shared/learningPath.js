import { helpTextForType } from './helpContent.js';
import { difficultyForSchoolLevel, learningStatusForEntry, normalizeSchoolLevel } from './learningExperience.js';
import { learningTypeLabel } from './subjects.js';

const CORE_LABELS = {
  addition: 'Addition',
  soustraction: 'Soustraction',
  multiplication: 'Multiplication',
  comparaison: 'Comparaison',
  division: 'Division',
  fraction: 'Fractions',
  geometrie: 'Géométrie',
  monnaie: 'Monnaie',
  longueur: 'Longueurs',
  temps: 'Heure et durées',
  probleme: 'Problèmes',
  'accord-pluriel': 'Accords au pluriel',
};

const LEVEL_OPENERS = {
  CP: 'Au CP, on manipule et on compte avec de petites quantités.',
  CE1: 'Au CE1, on explique son calcul avec des nombres et des mots.',
  CE2: 'Au CE2, on choisit une méthode efficace et on vérifie son résultat.',
  CM1: 'Au CM1, on décompose les nombres pour raisonner avec précision.',
  CM2: 'Au CM2, on compare plusieurs stratégies et on justifie sa réponse.',
};

const PEDAGOGY = {
  addition: {
    simple: 'Additionner, c’est réunir deux quantités. On peut avancer sur une ligne de nombres.',
    middle: 'Aligne unités, dizaines et centaines. Additionne chaque colonne et pense aux retenues.',
    advanced: 'Décompose un nombre pour calculer mentalement, ou pose l’opération en alignant les rangs.',
    trap: 'Ne colle pas les nombres : 12 + 3 ne donne pas 123.',
    visualKind: 'number-line',
  },
  soustraction: {
    simple: 'Soustraire, c’est retirer ou chercher une différence. On recule sur une ligne de nombres.',
    middle: 'Soustrais rang par rang. Si une unité manque, échange une dizaine contre dix unités.',
    advanced: 'Choisis entre retrait, complément ou opération posée selon les nombres.',
    trap: 'Dans une opération posée, ne soustrais pas toujours le petit chiffre du grand sans tenir compte de sa place.',
    visualKind: 'number-line',
  },
  multiplication: {
    simple: 'Multiplier, c’est former plusieurs groupes de même taille.',
    middle: 'Utilise les tables et décompose : 7 × 6 peut devenir 7 × 5 puis encore 7.',
    advanced: 'Appuie-toi sur la distributivité pour décomposer un facteur et contrôler le produit.',
    trap: 'Ne confonds pas 4 × 3 avec 4 + 3 : ce sont quatre groupes de trois.',
    visualKind: 'groups',
  },
  division: {
    simple: 'Diviser, c’est partager équitablement ou chercher combien de groupes sont possibles.',
    middle: 'Cherche dans la table du diviseur le produit qui redonne le nombre partagé.',
    advanced: 'Identifie quotient et reste, puis vérifie avec diviseur × quotient + reste.',
    trap: 'Le nombre de groupes et la taille de chaque groupe ne répondent pas à la même question.',
    visualKind: 'sharing',
  },
  fraction: {
    simple: 'Une fraction décrit des parts égales d’un tout.',
    middle: 'Le dénominateur indique le nombre de parts égales ; le numérateur indique les parts choisies.',
    advanced: 'Pour comparer, utilise un même dénominateur, une droite graduée ou une valeur repère comme un demi.',
    trap: 'Un grand dénominateur signifie des parts plus petites, pas une fraction forcément plus grande.',
    visualKind: 'fraction',
  },
  comparaison: {
    simple: 'Compare les quantités puis choisis <, > ou =.',
    middle: 'Compare d’abord le nombre de chiffres, puis les chiffres de gauche à droite.',
    advanced: 'Compare les valeurs de position et vérifie le sens du symbole avec sa grande ouverture.',
    trap: 'La pointe du symbole regarde toujours le plus petit nombre.',
    visualKind: 'comparison',
  },
  geometrie: {
    simple: 'Observe le contour et compte les côtés et les sommets.',
    middle: 'Décris une figure avec ses côtés, ses angles et ses propriétés.',
    advanced: 'Utilise les propriétés plutôt que l’apparence : longueurs, parallèles, perpendiculaires et angles.',
    trap: 'Une figure tournée reste la même figure.',
    visualKind: 'shape',
  },
  monnaie: {
    simple: 'Réunis pièces et billets en commençant par les plus grandes valeurs.',
    middle: 'Convertis si besoin : 1 € vaut 100 centimes, puis additionne dans la même unité.',
    advanced: 'Calcule le total ou la monnaie rendue en travaillant en centimes pour éviter les erreurs de virgule.',
    trap: 'Une pièce plus grande n’a pas forcément une valeur plus élevée : lis toujours le nombre.',
    visualKind: 'money',
  },
  longueur: {
    simple: 'Compare deux longueurs en partant du même point.',
    middle: 'Convertis les mesures dans la même unité avant de les comparer.',
    advanced: 'Choisis l’unité adaptée et utilise les relations entre mm, cm, m et km.',
    trap: 'On ne compare pas directement 2 m et 150 cm sans les convertir.',
    visualKind: 'bars',
  },
  temps: {
    simple: 'La petite aiguille donne l’heure et la grande aiguille donne les minutes.',
    middle: 'Une heure contient 60 minutes. Repère départ, durée et arrivée.',
    advanced: 'Pour calculer une durée, avance jusqu’à une heure ronde puis complète jusqu’à l’arrivée.',
    trap: 'Après 59 minutes, on change d’heure : les minutes ne vont pas jusqu’à 100.',
    visualKind: 'clock',
  },
  probleme: {
    simple: 'Repère ce que l’on connaît et ce que l’on cherche.',
    middle: 'Surligne les données utiles, choisis l’opération puis écris une phrase-réponse.',
    advanced: 'Organise les étapes, estime le résultat et vérifie que l’unité répond à la question.',
    trap: 'Tous les nombres du texte ne sont pas forcément utiles.',
    visualKind: 'problem',
  },
  'accord-pluriel': {
    simple: 'Au pluriel, on ajoute souvent un s au nom.',
    middle: 'Repère le déterminant puis applique la règle du pluriel, avec ses exceptions.',
    advanced: 'Vérifie toute la chaîne d’accord dans le groupe nominal et mémorise les pluriels particuliers.',
    trap: 'Les mots déjà terminés par s, x ou z ne changent généralement pas au pluriel.',
    visualKind: 'words',
  },
};

const SUBJECT_TRAPS = {
  anglais: 'Ne traduis pas mot à mot : utilise aussi le contexte de la phrase.',
  sciences: 'Une intuition n’est pas une preuve : cherche l’observation qui confirme la réponse.',
  logique: 'Vérifie la règle sur tous les éléments, pas seulement sur les deux premiers.',
  orthographe: 'Deux mots peuvent se prononcer pareil sans avoir le même sens ni la même écriture.',
  'histoire-geographie': 'Ne mélange pas la date d’un événement avec la période entière.',
  'culture-generale': 'Écarte les réponses impossibles avant de choisir celle qui te semble familière.',
  arts: 'Décris ce que tu observes ou entends avant de donner ton interprétation.',
};

function levelBand(schoolLevel) {
  if (schoolLevel === 'CP' || schoolLevel === 'CE1') return 'simple';
  if (schoolLevel === 'CE2') return 'middle';
  return 'advanced';
}

function workedExampleSteps(question = {}, schoolLevel = 'CE2', variantIndex = 0) {
  const variant = Math.abs(Number(variantIndex) || 0) % 3;
  switch (question.type) {
    case 'addition':
      if (variant === 1 && Number.isFinite(question.a) && Number.isFinite(question.b)) {
        const tens = Math.floor(question.b / 10) * 10;
        const units = question.b - tens;
        return [`Je décompose ${question.b} en ${tens} + ${units}.`, `${question.a} + ${tens} = ${question.a + tens}, puis + ${units} = ${question.answer}.`, `${question.a} + ${question.b} = ${question.answer}.`];
      }
      return [`Je repère les deux nombres : ${question.a} et ${question.b}.`, `Je les additionne : ${question.a} + ${question.b} = ${question.answer}.`];
    case 'soustraction':
      return [`Je pars de ${question.a} et je retire ${question.b}.`, `Je calcule : ${question.a} - ${question.b} = ${question.answer}.`];
    case 'multiplication':
      return [`Je cherche ${question.a} groupes de ${question.b}.`, `Je calcule : ${question.a} × ${question.b} = ${question.answer}.`];
    case 'division':
      return [`Je partage ${question.a} en groupes de ${question.b}.`, `Je calcule : ${question.a} ÷ ${question.b} = ${question.answer}.`];
    default:
      return variant === 1
        ? [`Je reformule la question avec mes mots.`, `Je cherche l’indice important dans « ${question.prompt ?? 'la question'} ».`, `Je retiens : « ${question.answer} ».`]
        : [`Je lis toute la question et je repère l’indice important.`, `Je retiens la réponse : « ${question.answer} ».`];
  }
}

function visualModelForQuestion(type, question = {}) {
  const kind = PEDAGOGY[type]?.visualKind ?? 'concept';
  return {
    type,
    kind,
    a: question.a ?? null,
    b: question.b ?? null,
    answer: question.answer ?? null,
    shape: question.shape ?? null,
    items: question.items ?? [],
  };
}

export function learningLessonForType(type, exampleQuestion = {}, schoolLevel = 'CE2', variantIndex = 0) {
  const label = CORE_LABELS[type] ?? learningTypeLabel(type);
  const normalizedLevel = normalizeSchoolLevel(schoolLevel);
  const pedagogy = PEDAGOGY[type];
  const subjectRule = helpTextForType(type);
  return {
    type,
    schoolLevel: normalizedLevel,
    title: `Comprendre : ${label}`,
    rule: `${LEVEL_OPENERS[normalizedLevel]} ${pedagogy?.[levelBand(normalizedLevel)] ?? subjectRule}`,
    commonMistake: pedagogy?.trap ?? SUBJECT_TRAPS[type] ?? 'Prends le temps de vérifier chaque mot avant de répondre.',
    visualModel: visualModelForQuestion(type, exampleQuestion),
    exampleVariant: Math.abs(Number(variantIndex) || 0) % 3,
    examplePrompt: exampleQuestion.prompt ?? `Un exemple sur ${label.toLowerCase()}`,
    exampleSteps: workedExampleSteps({ ...exampleQuestion, type }, normalizedLevel, variantIndex),
  };
}

export function adaptiveHintForQuestion(question = {}) {
  switch (question.type) {
    case 'addition':
      return `Décompose ${question.b} puis ajoute-le à ${question.a}, en commençant par les unités.`;
    case 'soustraction':
      return `Pars de ${question.a} et retire ${question.b}, ou cherche ce qu’il faut ajouter à ${question.b}.`;
    case 'multiplication':
      return `Dessine ${question.a} groupes de ${question.b}, puis compte tous les éléments.`;
    case 'division':
      return `Cherche combien de fois ${question.b} entre dans ${question.a}.`;
    case 'monnaie':
      return 'Commence par additionner toutes les valeurs en centimes. À la fin, 100 centimes forment 1 euro.';
    case 'temps':
      return 'Repère d’abord l’heure avec la petite aiguille, puis les minutes avec la grande.';
    case 'accord-pluriel':
      return `Observe le déterminant et la fin du mot « ${question.given ?? question.prompt ?? ''} ».`;
    default:
      return `Repère le mot important dans la question : « ${question.prompt ?? ''} », puis élimine les réponses impossibles.`;
  }
}

export function progressiveQuestionLevels(adaptiveDifficulty = 1, schoolLevel = 'CE2') {
  const target = difficultyForSchoolLevel(adaptiveDifficulty, schoolLevel);
  if (target === 1) return [1, 1, 1];
  if (target === 2) return [1, 2, 2];
  return [1, 2, 3];
}

export function weakestLearningType(profile = {}) {
  const notebookType = [...(profile.mistakeNotebook ?? [])]
    .filter((entry) => entry.type)
    .sort((a, b) => (b.errorCount ?? 0) - (a.errorCount ?? 0))[0]?.type;
  if (notebookType) return notebookType;
  const stats = Object.entries(profile.learningStats ?? {})
    .filter(([, value]) => (value.total ?? 0) > 0)
    .sort(([, left], [, right]) => ((left.correct ?? 0) / left.total) - ((right.correct ?? 0) / right.total));
  return stats[0]?.[0] ?? 'addition';
}

const DIAGNOSTIC_TYPES = {
  CP: ['addition', 'soustraction', 'comparaison', 'geometrie', 'monnaie', 'longueur', 'temps', 'probleme', 'accord-pluriel', 'logique'],
  CE1: ['addition', 'soustraction', 'multiplication', 'comparaison', 'geometrie', 'monnaie', 'longueur', 'probleme', 'accord-pluriel', 'logique'],
  CE2: ['addition', 'soustraction', 'multiplication', 'division', 'comparaison', 'probleme', 'accord-pluriel', 'anglais', 'sciences', 'logique'],
  CM1: ['addition', 'soustraction', 'multiplication', 'division', 'fraction', 'probleme', 'accord-pluriel', 'anglais', 'sciences', 'histoire-geographie'],
  CM2: ['addition', 'soustraction', 'multiplication', 'division', 'fraction', 'probleme', 'orthographe', 'anglais', 'sciences', 'histoire-geographie'],
};

export function diagnosticPlanForSchoolLevel(schoolLevel = 'CE2') {
  const normalizedLevel = normalizeSchoolLevel(schoolLevel);
  const maxDifficulty = difficultyForSchoolLevel(3, normalizedLevel);
  return DIAGNOSTIC_TYPES[normalizedLevel].map((type, index) => ({
    type,
    level: maxDifficulty === 1 ? 1 : Math.min(maxDifficulty, 1 + (index % maxDifficulty)),
  }));
}

function nextDate(isoDate, days = 1) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function compactLesson(lesson) {
  return {
    type: lesson.type,
    schoolLevel: lesson.schoolLevel,
    title: lesson.title,
    rule: lesson.rule,
    commonMistake: lesson.commonMistake,
    visualModel: lesson.visualModel,
    examplePrompt: lesson.examplePrompt,
    exampleSteps: lesson.exampleSteps,
  };
}

export function scheduleLearningRecap(existing = [], lesson, completedDate) {
  if (!lesson?.type) return [...existing];
  const recap = { ...compactLesson(lesson), completedDate, dueDate: nextDate(completedDate, 1) };
  return [recap, ...existing.filter((entry) => entry.type !== lesson.type)].slice(0, 12);
}

export function dueLearningRecap(recaps = [], today = new Date().toISOString().slice(0, 10)) {
  return [...recaps]
    .filter((entry) => entry.dueDate <= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null;
}

export function learnedLessonsAfterLesson(existing = [], lesson, completedDate, incorrectCount = 0) {
  if (!lesson?.type) return [...existing];
  const previous = existing.find((entry) => entry.type === lesson.type);
  const learned = {
    ...compactLesson(lesson),
    lessonCount: (previous?.lessonCount ?? 0) + 1,
    lastLearnedDate: completedDate,
    lastIncorrectCount: incorrectCount,
  };
  return [learned, ...existing.filter((entry) => entry.type !== lesson.type)].slice(0, 12);
}

export function learningPathSummary(profile = {}, sessions = [], today = new Date().toISOString().slice(0, 10)) {
  const statuses = (profile.mistakeNotebook ?? []).map(learningStatusForEntry);
  return {
    lessonMissions: sessions.filter((session) => session.missionKind === 'learning').length,
    diagnosticCompletedForLevel: profile.diagnosticCompletedForLevel ?? null,
    diagnosticPercent: profile.diagnosticPercent ?? null,
    retainedCount: statuses.filter((status) => status.id === 'acquis').length,
    progressingCount: statuses.filter((status) => status.id === 'en-progres').length,
    fragileCount: statuses.filter((status) => status.id === 'a-revoir').length,
    dueCount: (profile.mistakeNotebook ?? []).filter((entry) => !entry.nextReviewDate || entry.nextReviewDate <= today).length,
  };
}
