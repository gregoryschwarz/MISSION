import { randomInt } from './random.js';

export const NAMES = [
  { name: 'Léa', pronoun: 'elle' },
  { name: 'Emma', pronoun: 'elle' },
  { name: 'Chloé', pronoun: 'elle' },
  { name: 'Tom', pronoun: 'il' },
  { name: 'Lucas', pronoun: 'il' },
  { name: 'Nathan', pronoun: 'il' },
];

export const OBJECTS = ['bonbons', 'billes', 'images', 'cartes de jeu', 'gommes', 'autocollants'];

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export const ADDITION_TEMPLATES = [
  (name, pronoun, object, a, b) => `${name} a ${a} ${object}. ${capitalize(pronoun)} en reçoit ${b} de plus. Combien en a-t-${pronoun} en tout ?`,
  (name, pronoun, object, a, b) => `${name} a ${a} ${object}. ${capitalize(pronoun)} en trouve ${b} de plus. Combien en a-t-${pronoun} en tout ?`,
  (name, pronoun, object, a, b) => `Dans un panier, il y a ${a} ${object}. On en ajoute ${b}. Combien y en a-t-il maintenant ?`,
];

export const SUBTRACTION_TEMPLATES = [
  (name, pronoun, object, a, b) => `${name} a ${a} ${object}. ${capitalize(pronoun)} en donne ${b} à son ami. Combien lui en reste-t-il ?`,
  (name, pronoun, object, a, b) => `${name} avait ${a} ${object}. ${capitalize(pronoun)} en a perdu ${b}. Combien lui en reste-t-il ?`,
  (name, pronoun, object, a, b) => `Il y a ${a} ${object} dans une boîte. On en retire ${b}. Combien en reste-t-il ?`,
];

export function wordProblemText(operation, a, b) {
  const { name, pronoun } = NAMES[randomInt(0, NAMES.length - 1)];
  const object = OBJECTS[randomInt(0, OBJECTS.length - 1)];
  const templates = operation === 'addition' ? ADDITION_TEMPLATES : SUBTRACTION_TEMPLATES;
  const template = templates[randomInt(0, templates.length - 1)];
  return template(name, pronoun, object, a, b);
}
