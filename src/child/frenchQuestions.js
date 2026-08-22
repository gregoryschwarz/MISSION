import { randomInt, shuffle } from './random.js';
import { generateUniqueQuestions } from './uniqueQuestions.js';

export const REGULAR_WORDS = [
  { singular: 'un chat', plural: 'des chats' },
  { singular: 'une table', plural: 'des tables' },
  { singular: 'un livre', plural: 'des livres' },
  { singular: 'une fleur', plural: 'des fleurs' },
  { singular: 'un ami', plural: 'des amis' },
  { singular: 'une pomme', plural: 'des pommes' },
  { singular: 'un ballon', plural: 'des ballons' },
  { singular: 'une école', plural: 'des écoles' },
  { singular: 'un jardin', plural: 'des jardins' },
  { singular: 'une voiture', plural: 'des voitures' },
  { singular: 'un crayon', plural: 'des crayons' },
  { singular: 'une étoile', plural: 'des étoiles' },
  { singular: 'un nuage', plural: 'des nuages' },
  { singular: 'une montagne', plural: 'des montagnes' },
  { singular: 'un bateau', plural: 'des bateaux' },
  { singular: 'une rivière', plural: 'des rivières' },
  { singular: 'un ordinateur', plural: 'des ordinateurs' },
  { singular: 'une question', plural: 'des questions' },
  { singular: 'un exercice', plural: 'des exercices' },
  { singular: 'une forêt', plural: 'des forêts' },
  { singular: 'un village', plural: 'des villages' },
  { singular: 'une minute', plural: 'des minutes' },
  { singular: 'un dessin', plural: 'des dessins' },
];

export const X_PLURAL_WORDS = [
  { singular: 'un cheval', plural: 'des chevaux' },
  { singular: 'un chou', plural: 'des choux' },
  { singular: 'un oiseau', plural: 'des oiseaux' },
  { singular: 'un bijou', plural: 'des bijoux' },
  { singular: 'un jeu', plural: 'des jeux' },
  { singular: 'un genou', plural: 'des genoux' },
  { singular: 'un journal', plural: 'des journaux' },
  { singular: 'un animal', plural: 'des animaux' },
  { singular: 'un travail', plural: 'des travaux' },
  { singular: 'un vitrail', plural: 'des vitraux' },
  { singular: 'un cheveu', plural: 'des cheveux' },
  { singular: 'un feu', plural: 'des feux' },
  { singular: 'un caillou', plural: 'des cailloux' },
  { singular: 'un hibou', plural: 'des hiboux' },
  { singular: 'un pou', plural: 'des poux' },
  { singular: 'un corail', plural: 'des coraux' },
  { singular: 'un émail', plural: 'des émaux' },
  { singular: 'un soupirail', plural: 'des soupiraux' },
  { singular: 'un bail', plural: 'des baux' },
  { singular: 'un lieu', plural: 'des lieux' },
  { singular: 'un milieu', plural: 'des milieux' },
  { singular: 'un vœu', plural: 'des vœux' },
  { singular: 'un noyau', plural: 'des noyaux' },
];

export const INVARIABLE_WORDS = [
  { singular: 'une souris', plural: 'des souris' },
  { singular: 'un nez', plural: 'des nez' },
  { singular: 'une croix', plural: 'des croix' },
  { singular: 'un tapis', plural: 'des tapis' },
  { singular: 'un prix', plural: 'des prix' },
  { singular: 'une voix', plural: 'des voix' },
  { singular: 'un choix', plural: 'des choix' },
  { singular: 'un repas', plural: 'des repas' },
  { singular: 'un bras', plural: 'des bras' },
  { singular: 'un progrès', plural: 'des progrès' },
  { singular: 'une noix', plural: 'des noix' },
  { singular: 'une toux', plural: 'des toux' },
  { singular: 'un avis', plural: 'des avis' },
  { singular: 'un concours', plural: 'des concours' },
  { singular: 'un discours', plural: 'des discours' },
  { singular: 'un secours', plural: 'des secours' },
  { singular: 'un gaz', plural: 'des gaz' },
  { singular: 'un rendez-vous', plural: 'des rendez-vous' },
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
