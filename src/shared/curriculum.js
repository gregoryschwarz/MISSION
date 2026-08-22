export const PRIMARY_LEVELS = ['CP', 'CE1', 'CE2', 'CM1', 'CM2'];

const LEVEL_WORDING = {
  CP: { number: 'jusqu’à 100', calculation: 'avec de petites quantités', reading: 'des phrases courtes' },
  CE1: { number: 'jusqu’à 1 000', calculation: 'avec les premières techniques', reading: 'des textes courts' },
  CE2: { number: 'jusqu’à 10 000', calculation: 'en choisissant une stratégie', reading: 'des textes variés' },
  CM1: { number: 'jusqu’au million', calculation: 'avec nombres entiers et fractions', reading: 'des textes structurés' },
  CM2: { number: 'grands nombres et décimaux', calculation: 'en justifiant sa méthode', reading: 'des textes complexes' },
};

const COMPETENCY_TEMPLATES = [
  { key: 'maths-calcul-addition', subject: 'Mathématiques', chapterId: 'calcul', emoji: '➕', questionType: 'addition', label: (w) => `Additionner ${w.calculation}` },
  { key: 'maths-calcul-soustraction', subject: 'Mathématiques', chapterId: 'calcul', emoji: '➖', questionType: 'soustraction', label: (w) => `Soustraire ${w.calculation}` },
  { key: 'maths-calcul-multiplication', subject: 'Mathématiques', chapterId: 'calcul', emoji: '✖️', questionType: 'multiplication', label: () => 'Comprendre et utiliser la multiplication' },
  { key: 'maths-calcul-division', subject: 'Mathématiques', chapterId: 'calcul', emoji: '➗', questionType: 'division', label: () => 'Partager et utiliser la division' },
  { key: 'maths-nombres-comparaison', subject: 'Mathématiques', chapterId: 'nombres', emoji: '⚖️', questionType: 'comparaison', label: (w) => `Lire et comparer les nombres ${w.number}` },
  { key: 'maths-nombres-fractions', subject: 'Mathématiques', chapterId: 'nombres', emoji: '🍕', questionType: 'fraction', label: () => 'Représenter et comparer des fractions' },
  { key: 'maths-mesures-monnaie', subject: 'Mathématiques', chapterId: 'mesures', emoji: '🪙', questionType: 'monnaie', label: () => 'Calculer avec les euros et les centimes' },
  { key: 'maths-mesures-temps', subject: 'Mathématiques', chapterId: 'mesures', emoji: '⏱️', questionType: 'temps', label: () => 'Lire l’heure et calculer des durées' },
  { key: 'maths-geometrie-figures', subject: 'Mathématiques', chapterId: 'geometrie', emoji: '📐', questionType: 'geometrie', label: () => 'Reconnaître et décrire les figures' },
  { key: 'francais-lecture', subject: 'Français', chapterId: 'francais', emoji: '📖', questionType: 'francais', label: (w) => `Comprendre ${w.reading}` },
  { key: 'francais-orthographe', subject: 'Français', chapterId: 'francais', emoji: '✍️', questionType: 'orthographe', label: () => 'Écrire les mots et les accords correctement' },
  { key: 'francais-accords', subject: 'Français', chapterId: 'francais', emoji: '📝', questionType: 'accord-pluriel', label: () => 'Accorder les mots dans la phrase' },
  { key: 'anglais-vocabulaire', subject: 'Anglais', chapterId: 'langues', emoji: '🇬🇧', questionType: 'anglais', label: () => 'Comprendre le vocabulaire courant' },
  { key: 'sciences-observation', subject: 'Sciences', chapterId: 'monde', emoji: '🔬', questionType: 'sciences', label: () => 'Observer et expliquer le monde vivant' },
  { key: 'logique-raisonnement', subject: 'Logique', chapterId: 'logique', emoji: '🧩', questionType: 'logique', label: () => 'Chercher une règle et justifier son raisonnement' },
];

const CHAPTERS = {
  calcul: { title: 'La cité des calculs', emoji: '🏙️' },
  nombres: { title: 'La vallée des nombres', emoji: '🔢' },
  mesures: { title: 'Le laboratoire des mesures', emoji: '🧪' },
  geometrie: { title: 'Le royaume des formes', emoji: '🏰' },
  francais: { title: 'La bibliothèque des mots', emoji: '📚' },
  langues: { title: 'Le voyage des langues', emoji: '🌍' },
  monde: { title: 'L’expédition scientifique', emoji: '🔭' },
  logique: { title: 'Le temple des énigmes', emoji: '🗿' },
};

function safeLevel(level) {
  return PRIMARY_LEVELS.includes(level) ? level : 'CE2';
}

export function competenciesForLevel(level = 'CE2') {
  const normalized = safeLevel(level);
  const wording = LEVEL_WORDING[normalized];
  const ageAppropriateTemplates = COMPETENCY_TEMPLATES.filter((template) => {
    if (normalized === 'CP') return !['maths-calcul-division', 'maths-nombres-fractions'].includes(template.key);
    if (normalized === 'CE1') return template.key !== 'maths-nombres-fractions';
    return true;
  });
  return ageAppropriateTemplates.map((template, index) => ({
    id: `${normalized}-${template.key}`,
    level: normalized,
    order: index + 1,
    subject: template.subject,
    chapterId: template.chapterId,
    chapterTitle: CHAPTERS[template.chapterId].title,
    emoji: template.emoji,
    questionType: template.questionType,
    label: template.label(wording),
  }));
}

export function competencyStatus(progress = {}) {
  if (progress.validated && (progress.total ?? 0) >= 5 && (progress.correct ?? 0) / Math.max(1, progress.total) >= 0.8 && (progress.successfulDays ?? []).length >= 2) return 'mastered';
  if ((progress.total ?? 0) > 0) return 'practice';
  return 'discovery';
}

export function competencyProgressAfterMission(existing = {}, summary = {}) {
  if (!summary.competencyId) return { ...existing };
  const previous = existing[summary.competencyId] ?? {};
  const successfulDays = new Set(previous.successfulDays ?? []);
  if ((summary.correctCount ?? 0) / Math.max(1, summary.questionsTotal ?? 0) >= 0.7 && summary.date) successfulDays.add(summary.date);
  return {
    ...existing,
    [summary.competencyId]: {
      correct: (previous.correct ?? 0) + (summary.correctCount ?? 0),
      total: (previous.total ?? 0) + (summary.questionsTotal ?? 0),
      attempts: (previous.attempts ?? 0) + 1,
      successfulDays: [...successfulDays].slice(-12),
      validated: previous.validated ?? false,
      lastDate: summary.date ?? previous.lastDate ?? null,
    },
  };
}

export function chapterValidation(chapterId, result = {}) {
  const percent = result.questionsTotal ? Math.round((result.correctCount / result.questionsTotal) * 100) : 0;
  const passed = (result.questionsTotal ?? 0) >= 5 && percent >= 80;
  return { chapterId, percent, passed, certificateUnlocked: passed };
}

export function nextLearningQuest(level = 'CE2', progress = {}) {
  const competency = competenciesForLevel(level).find((item) => competencyStatus(progress[item.id]) !== 'mastered') ?? competenciesForLevel(level)[0];
  const chapter = CHAPTERS[competency.chapterId];
  return {
    competencyId: competency.id,
    chapterId: competency.chapterId,
    questionType: competency.questionType,
    emoji: chapter.emoji,
    title: chapter.title,
    objective: competency.label,
    story: `Réussis la mission « ${competency.label} » pour avancer dans ${chapter.title.toLowerCase()}.`,
  };
}

export function certificateForChapter(level, chapterId, childName, date) {
  const normalized = safeLevel(level);
  const chapter = CHAPTERS[chapterId] ?? { title: 'Chapitre maîtrisé', emoji: '⭐' };
  return {
    id: `${normalized}-${chapterId}`,
    childName: childName || 'Élève',
    level: normalized,
    chapterId,
    chapterTitle: chapter.title,
    chapterEmoji: chapter.emoji,
    emoji: '🏆',
    title: `Certificat · ${chapter.title}`,
    date,
  };
}

export function parentCompetencyOverview(level = 'CE2', progress = {}) {
  const competencies = competenciesForLevel(level).map((item) => ({ ...item, status: competencyStatus(progress[item.id]), progress: progress[item.id] ?? {} }));
  return {
    total: competencies.length,
    mastered: competencies.filter((item) => item.status === 'mastered').length,
    practising: competencies.filter((item) => item.status === 'practice').length,
    discovery: competencies.filter((item) => item.status === 'discovery').length,
    nextCompetency: competencies.find((item) => item.status === 'discovery') ?? competencies.find((item) => item.status !== 'mastered') ?? null,
    competencies,
  };
}

export function normalizeHomeworkAssignment(assignment = {}) {
  const competencyIds = [...new Set(assignment.competencyIds ?? [])].filter(Boolean).slice(0, 6);
  return {
    competencyIds,
    questionCount: Math.min(20, Math.max(3, Math.round(Number(assignment.questionCount) || 10))),
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(assignment.dueDate ?? '') ? assignment.dueDate : null,
    active: assignment.active !== false && competencyIds.length > 0,
    completedDate: assignment.completedDate ?? null,
  };
}

export function homeworkQuestionPlan(assignment = {}) {
  const normalized = normalizeHomeworkAssignment(assignment);
  if (!normalized.competencyIds.length) return [];
  const base = Math.floor(normalized.questionCount / normalized.competencyIds.length);
  const remainder = normalized.questionCount % normalized.competencyIds.length;
  return normalized.competencyIds.map((competencyId, index) => ({ competencyId, count: base + (index < remainder ? 1 : 0) }));
}

export function vacationReviewPlan(level = 'CE2', progress = {}, date = new Date()) {
  const month = date.getMonth();
  const vacation = { 1: 'hiver', 3: 'printemps', 6: 'été', 7: 'été', 11: 'Noël' }[month] ?? null;
  const candidates = competenciesForLevel(level)
    .filter((item) => competencyStatus(progress[item.id]) !== 'mastered')
    .sort((left, right) => {
      const a = progress[left.id] ?? {};
      const b = progress[right.id] ?? {};
      const attemptedPriority = Number((b.total ?? 0) > 0) - Number((a.total ?? 0) > 0);
      if (attemptedPriority) return attemptedPriority;
      return ((a.correct ?? 0) / Math.max(1, a.total ?? 0)) - ((b.correct ?? 0) / Math.max(1, b.total ?? 0));
    });
  return {
    active: !!vacation,
    season: vacation,
    title: 'Révisions de vacances',
    competencyIds: candidates.slice(0, 6).map((item) => item.id),
    questionCount: Math.min(12, Math.max(6, candidates.length * 2)),
  };
}
