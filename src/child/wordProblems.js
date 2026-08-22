import { randomInt } from './random.js';

export const NAMES = [
  { name: 'Léa', pronoun: 'elle' },
  { name: 'Emma', pronoun: 'elle' },
  { name: 'Chloé', pronoun: 'elle' },
  { name: 'Tom', pronoun: 'il' },
  { name: 'Lucas', pronoun: 'il' },
  { name: 'Nathan', pronoun: 'il' },
  { name: 'Ambre', pronoun: 'elle' },
  { name: 'Lina', pronoun: 'elle' },
  { name: 'Inès', pronoun: 'elle' },
  { name: 'Hugo', pronoun: 'il' },
  { name: 'Adam', pronoun: 'il' },
  { name: 'Noé', pronoun: 'il' },
];

export const OBJECTS = ['bonbons', 'billes', 'images', 'cartes de jeu', 'gommes', 'autocollants', 'livres', 'crayons', 'coquillages', 'figurines', 'pommes', 'fleurs', 'perles', 'jetons', 'timbres', 'ballons', 'noisettes', 'étoiles en papier'];

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export const ADDITION_TEMPLATES = [
  (name, pronoun, object, a, b) => `${name} a ${a} ${object}. ${capitalize(pronoun)} en reçoit ${b} de plus. Combien en a-t-${pronoun} en tout ?`,
  (name, pronoun, object, a, b) => `${name} a ${a} ${object}. ${capitalize(pronoun)} en trouve ${b} de plus. Combien en a-t-${pronoun} en tout ?`,
  (name, pronoun, object, a, b) => `Dans un panier, il y a ${a} ${object}. On en ajoute ${b}. Combien y en a-t-il maintenant ?`,
  (name, pronoun, object, a, b) => `Une classe possède ${a} ${object} et en achète ${b} autres. Combien en possède-t-elle en tout ?`,
  (name, pronoun, object, a, b) => `${name} range ${a} ${object} le matin puis ${b} l’après-midi. Combien ${name} en a-t-${pronoun} rangé au total ?`,
  (name, pronoun, object, a, b) => `Une boîte contient ${a} ${object}. Une seconde en contient ${b}. Combien les deux boîtes en contiennent-elles ?`,
  (name, pronoun, object, a, b) => `Au premier jeu, ${name} gagne ${a} ${object}, puis ${b} au second. Quel est son total ?`,
  (name, pronoun, object, a, b) => `On place ${a} ${object} sur une table et ${b} sur une autre. Combien y en a-t-il ensemble ?`,
];

export const SUBTRACTION_TEMPLATES = [
  (name, pronoun, object, a, b) => `${name} a ${a} ${object}. ${capitalize(pronoun)} en donne ${b} à son ami. Combien lui en reste-t-il ?`,
  (name, pronoun, object, a, b) => `${name} avait ${a} ${object}. ${capitalize(pronoun)} en a perdu ${b}. Combien lui en reste-t-il ?`,
  (name, pronoun, object, a, b) => `Il y a ${a} ${object} dans une boîte. On en retire ${b}. Combien en reste-t-il ?`,
  (name, pronoun, object, a, b) => `Une collection contient ${a} ${object}. ${name} en utilise ${b}. Combien en reste-t-il ?`,
  (name, pronoun, object, a, b) => `La classe avait ${a} ${object} et en distribue ${b}. Combien en garde-t-elle ?`,
  (name, pronoun, object, a, b) => `${name} doit ranger ${a} ${object}. ${capitalize(pronoun)} en a déjà rangé ${b}. Combien reste-t-il à ranger ?`,
  (name, pronoun, object, a, b) => `Dans un sac, il y avait ${a} ${object}. On en sort ${b}. Quel est le nouveau nombre ?`,
  (name, pronoun, object, a, b) => `Un magasin avait ${a} ${object} et en vend ${b}. Combien lui en reste-t-il ?`,
];

export function wordProblemText(operation, a, b) {
  const { name, pronoun } = NAMES[randomInt(0, NAMES.length - 1)];
  const object = OBJECTS[randomInt(0, OBJECTS.length - 1)];
  const templates = operation === 'addition' ? ADDITION_TEMPLATES : SUBTRACTION_TEMPLATES;
  const template = templates[randomInt(0, templates.length - 1)];
  return template(name, pronoun, object, a, b);
}
