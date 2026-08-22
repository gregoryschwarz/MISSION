export const SUBJECTS = [
  { id: 'anglais', label: 'Anglais', emoji: '🇬🇧', description: 'Mots, phrases courtes et compréhension', accent: 'sky' },
  { id: 'culture-generale', label: 'Culture générale', emoji: '🌍', description: 'Monde, animaux, inventions et découvertes', accent: 'sun' },
  { id: 'sciences', label: 'Sciences', emoji: '🔬', description: 'Vivant, corps humain, nature et espace', accent: 'mint' },
  { id: 'histoire-geographie', label: 'Histoire-géographie', emoji: '🗺️', description: 'Époques, personnages, cartes et continents', accent: 'coral' },
  { id: 'logique', label: 'Logique', emoji: '🧩', description: 'Suites, intrus, déduction et casse-têtes', accent: 'violet' },
  { id: 'orthographe', label: 'Orthographe', emoji: '✍️', description: 'Mots justes, homophones et conjugaison', accent: 'pink' },
  { id: 'arts', label: 'Arts et musique', emoji: '🎨', description: 'Couleurs, instruments, rythmes et œuvres', accent: 'rainbow' },
];

export const DEFAULT_ENABLED_SUBJECT_IDS = SUBJECTS.map((subject) => subject.id);

export function subjectForId(subjectId) {
  return SUBJECTS.find((subject) => subject.id === subjectId) ?? null;
}

export function normalizeEnabledSubjects(subjectIds) {
  if (!Array.isArray(subjectIds)) return [...DEFAULT_ENABLED_SUBJECT_IDS];
  const requested = new Set(subjectIds);
  return SUBJECTS.filter((subject) => requested.has(subject.id)).map((subject) => subject.id);
}

export function learningTypeLabel(type) {
  return subjectForId(type)?.label ?? String(type ?? '').replaceAll('-', ' ');
}

export function learningTypeEmoji(type) {
  return subjectForId(type)?.emoji ?? null;
}
