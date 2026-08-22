import { randomInt, shuffle } from './random.js';
import { generateUniqueQuestions } from './uniqueQuestions.js';

export const REGULAR_WORDS = [
  { singular: 'un chat', plural: 'des chats' },
  { singular: 'une table', plural: 'des tables' },
  { singular: 'un livre', plural: 'des livres' },
  { singular: 'une fleur', plural: 'des fleurs' },
  { singular: 'un ami', plural: 'des amis' },
  { singular: 'une pomme', plural: 'des pommes' },
];

export const X_PLURAL_WORDS = [
  { singular: 'un cheval', plural: 'des chevaux' },
  { singular: 'un chou', plural: 'des choux' },
  { singular: 'un oiseau', plural: 'des oiseaux' },
  { singular: 'un bijou', plural: 'des bijoux' },
  { singular: 'un jeu', plural: 'des jeux' },
  { singular: 'un genou', plural: 'des genoux' },
];

export const INVARIABLE_WORDS = [
  { singular: 'une souris', plural: 'des souris' },
  { singular: 'un nez', plural: 'des nez' },
  { singular: 'une croix', plural: 'des croix' },
  { singular: 'un tapis', plural: 'des tapis' },
];

const WORDS_BY_LEVEL = {
  1: REGULAR_WORDS,
  2: [...REGULAR_WORDS, ...X_PLURAL_WORDS],
  3: [...REGULAR_WORDS, ...X_PLURAL_WORDS, ...INVARIABLE_WORDS],
};

export function generateAccordPluriel(level = 1) {
  const words = WORDS_BY_LEVEL[level] ?? WORDS_BY_LEVEL[1];
  const word = words[randomInt(0, words.length - 1)];
  const askPlural = randomInt(0, 1) === 0;
  const given = askPlural ? word.singular : word.plural;
  const answer = askPlural ? word.plural : word.singular;
  const prompt = askPlural
    ? `Quel est le pluriel de "${given}" ?`
    : `Quel est le singulier de "${given}" ?`;
  const distractors = new Set();
  while (distractors.size < 2) {
    const other = words[randomInt(0, words.length - 1)];
    const candidate = askPlural ? other.plural : other.singular;
    if (candidate !== answer) distractors.add(candidate);
  }
  return {
    type: 'accord-pluriel',
    given,
    answer,
    prompt,
    options: shuffle([answer, ...distractors]),
  };
}

const FRENCH_GENERATORS = {
  'accord-pluriel': generateAccordPluriel,
};

export const FRENCH_TYPES = Object.keys(FRENCH_GENERATORS);

export function generateFrenchMission(count = 10, difficultyLevels = {}) {
  const questions = generateUniqueQuestions(count, (i) => {
    const type = FRENCH_TYPES[i % FRENCH_TYPES.length];
    const level = difficultyLevels[type] ?? 1;
    return FRENCH_GENERATORS[type](level);
  });
  return shuffle(questions);
}
