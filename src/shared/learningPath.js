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

function workedExampleSteps(question = {}) {
  switch (question.type) {
    case 'addition':
      return [`Je repère les deux nombres : ${question.a} et ${question.b}.`, `Je les additionne : ${question.a} + ${question.b} = ${question.answer}.`];
    case 'soustraction':
      return [`Je pars de ${question.a} et je retire ${question.b}.`, `Je calcule : ${question.a} - ${question.b} = ${question.answer}.`];
    case 'multiplication':
      return [`Je cherche ${question.a} groupes de ${question.b}.`, `Je calcule : ${question.a} × ${question.b} = ${question.answer}.`];
    case 'division':
      return [`Je partage ${question.a} en groupes de ${question.b}.`, `Je calcule : ${question.a} ÷ ${question.b} = ${question.answer}.`];
    default:
      return [`Je lis toute la question et je repère l’indice important.`, `Je retiens la réponse : « ${question.answer} ».`];
  }
}

export function learningLessonForType(type, exampleQuestion = {}) {
  const label = CORE_LABELS[type] ?? learningTypeLabel(type);
  return {
    type,
    title: `Comprendre : ${label}`,
    rule: helpTextForType(type),
    examplePrompt: exampleQuestion.prompt ?? `Un exemple sur ${label.toLowerCase()}`,
    exampleSteps: workedExampleSteps({ ...exampleQuestion, type }),
  };
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
