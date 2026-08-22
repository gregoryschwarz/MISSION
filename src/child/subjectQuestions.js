import { randomInt, shuffle } from './random.js';
import { subjectForId } from '../shared/subjects.js';
import { difficultyForSchoolLevel, surpriseSubjectIds } from '../shared/learningExperience.js';

const q = (prompt, answer, distractorA, distractorB) => ({ prompt, answer, distractors: [distractorA, distractorB] });

const BASE_SUBJECT_QUESTION_BANKS = {
  anglais: {
    1: [
      q('🇬🇧 Que veut dire « cat » ?', 'chat', 'chien', 'lapin'),
      q('🇬🇧 Que veut dire « blue » ?', 'bleu', 'rouge', 'vert'),
      q('🇬🇧 Quel mot signifie « trois » ?', 'three', 'tree', 'thirteen'),
      q('🇬🇧 Que veut dire « hello » ?', 'bonjour', 'au revoir', 'merci'),
    ],
    2: [
      q('🇬🇧 Que veut dire « classroom » ?', 'salle de classe', 'cour de récréation', 'cantine'),
      q('🇬🇧 Quel jour vient après Monday ?', 'Tuesday', 'Sunday', 'Friday'),
      q('🇬🇧 Que veut dire « sister » ?', 'sœur', 'mère', 'cousine'),
      q('🇬🇧 Complète : I ___ a book.', 'read', 'drink', 'sleep'),
    ],
    3: [
      q('🇬🇧 Que signifie « Where are you going? » ?', 'Où vas-tu ?', 'Quel âge as-tu ?', 'Que manges-tu ?'),
      q('🇬🇧 Complète : She ___ two brothers.', 'has', 'have', 'is'),
      q('🇬🇧 Quel est le contraire de « difficult » ?', 'easy', 'heavy', 'slow'),
      q('🇬🇧 Choisis la phrase correcte.', 'They are playing.', 'They is playing.', 'They playing are.'),
    ],
  },
  'culture-generale': {
    1: [
      q('🌍 Quelle est la capitale de la France ?', 'Paris', 'Lyon', 'Marseille'),
      q('🐼 Quel animal mange principalement du bambou ?', 'panda', 'girafe', 'dauphin'),
      q('🌈 Combien de couleurs compte traditionnellement un arc-en-ciel ?', '7', '5', '9'),
      q('📚 Où peut-on emprunter des livres ?', 'bibliothèque', 'pharmacie', 'gare'),
    ],
    2: [
      q('🌍 Quel est le plus grand océan ?', 'Pacifique', 'Atlantique', 'Arctique'),
      q('🗼 Dans quel pays se trouve la tour de Pise ?', 'Italie', 'Espagne', 'Grèce'),
      q('🐋 Quel est le plus grand animal vivant ?', 'baleine bleue', 'éléphant', 'requin blanc'),
      q('☎️ Quelle invention permet de parler à distance ?', 'téléphone', 'boussole', 'microscope'),
    ],
    3: [
      q('🧭 Quel point cardinal est opposé au nord ?', 'sud', 'est', 'ouest'),
      q('🗣️ Quelle langue est principalement parlée au Brésil ?', 'portugais', 'espagnol', 'italien'),
      q('🏛️ Quelle civilisation a construit le Colisée ?', 'les Romains', 'les Vikings', 'les Mayas'),
      q('🔭 À quoi sert principalement un télescope ?', 'observer les astres', 'mesurer la température', 'écouter les sons'),
    ],
  },
  sciences: {
    1: [
      q('🔬 Avec quel organe voit-on ?', 'les yeux', 'les oreilles', 'les poumons'),
      q('🌱 De quoi une plante a-t-elle besoin pour pousser ?', 'eau et lumière', 'plastique et sable', 'sel et peinture'),
      q('🧊 Quel est l’état de l’eau dans un glaçon ?', 'solide', 'liquide', 'gazeux'),
      q('🌍 Sur quelle planète vivons-nous ?', 'la Terre', 'Mars', 'Jupiter'),
    ],
    2: [
      q('🫁 Quel organe nous aide à respirer ?', 'les poumons', 'l’estomac', 'les reins'),
      q('🦋 Comment appelle-t-on le changement de la chenille en papillon ?', 'métamorphose', 'évaporation', 'germination'),
      q('☁️ Quand l’eau liquide devient vapeur, c’est…', 'l’évaporation', 'la fusion', 'la congélation'),
      q('🧲 Quel matériau est attiré par un aimant ?', 'fer', 'bois', 'verre'),
    ],
    3: [
      q('☀️ Quelle planète est la plus proche du Soleil ?', 'Mercure', 'Vénus', 'Mars'),
      q('🌿 Quel gaz les plantes absorbent-elles principalement ?', 'dioxyde de carbone', 'oxygène', 'hélium'),
      q('🩸 Quel organe fait circuler le sang ?', 'le cœur', 'le foie', 'le cerveau'),
      q('♻️ Quel déchet peut généralement être recyclé ?', 'bouteille en verre', 'mouchoir sale', 'reste de repas'),
    ],
  },
  'histoire-geographie': {
    1: [
      q('🗺️ Sur quel continent se trouve la France ?', 'Europe', 'Afrique', 'Asie'),
      q('🏰 Qui vivait souvent dans un château fort ?', 'un seigneur', 'un astronaute', 'un pharaon'),
      q('🌊 Comment appelle-t-on une grande étendue d’eau salée ?', 'un océan', 'une forêt', 'une montagne'),
      q('🧭 Sur une carte classique, où se trouve le nord ?', 'en haut', 'en bas', 'à droite'),
    ],
    2: [
      q('⚔️ Quelle période vient après l’Antiquité ?', 'le Moyen Âge', 'la Préhistoire', 'les Temps modernes'),
      q('🇪🇬 Quel peuple a construit les pyramides de Gizeh ?', 'les Égyptiens', 'les Gaulois', 'les Vikings'),
      q('🏔️ Quelle chaîne de montagnes sépare en partie la France et l’Espagne ?', 'les Pyrénées', 'les Alpes', 'l’Himalaya'),
      q('🌍 Quel continent se situe au sud de l’Europe ?', 'Afrique', 'Amérique du Nord', 'Océanie'),
    ],
    3: [
      q('👑 En quelle année commence la Révolution française ?', '1789', '1492', '1914'),
      q('🚢 Quel navigateur a traversé l’Atlantique en 1492 ?', 'Christophe Colomb', 'Louis Pasteur', 'Jules César'),
      q('🏞️ Quel fleuve traverse Paris ?', 'la Seine', 'la Loire', 'le Rhône'),
      q('🌐 Que représente l’échelle d’une carte ?', 'la réduction des distances', 'la hauteur des montagnes', 'la météo du jour'),
    ],
  },
  logique: {
    1: [
      q('🧩 Complète la suite : 2, 4, 6, …', '8', '7', '10'),
      q('🔎 Trouve l’intrus : chat, chien, pomme.', 'pomme', 'chat', 'chien'),
      q('🧠 Si Léa est plus grande que Zoé, qui est la plus petite ?', 'Zoé', 'Léa', 'elles ont la même taille'),
      q('🔷 Quelle forme vient ensuite : ○ □ ○ □ …', '○', '□', '△'),
    ],
    2: [
      q('🧩 Complète : 3, 6, 9, 12, …', '15', '14', '18'),
      q('🔎 Quel nombre n’est pas pair ?', '7', '8', '12'),
      q('🧠 Tous les tulipes sont des fleurs. Cette plante est une tulipe. C’est donc…', 'une fleur', 'un arbre', 'impossible à savoir'),
      q('🔢 Je pense à un nombre. J’ajoute 4 et j’obtiens 10.', '6', '14', '5'),
    ],
    3: [
      q('🧩 Complète : 1, 2, 4, 8, …', '16', '10', '12'),
      q('🔢 Complète : 20, 17, 14, 11, …', '8', '9', '7'),
      q('🧠 Emma est avant Lila, et Lila avant Noé. Qui est au milieu ?', 'Lila', 'Emma', 'Noé'),
      q('🔐 Un code suit la règle A=1, B=2, C=3. Combien vaut CAB ?', '312', '123', '321'),
    ],
  },
  orthographe: {
    1: [
      q('✍️ Quel mot est bien écrit ?', 'maison', 'méson', 'maizon'),
      q('✍️ Complète : une petite ___ rouge.', 'fleur', 'fleure', 'fleurs'),
      q('✍️ Quel mot commence par une majuscule ?', 'Paris', 'pARIS', 'paris'),
      q('✍️ Complète : Les chats sont ___.', 'noirs', 'noir', 'noires'),
    ],
    2: [
      q('✍️ Complète : Il ___ un vélo.', 'a', 'à', 'as'),
      q('✍️ Complète : Je vais ___ l’école.', 'à', 'a', 'as'),
      q('✍️ Quel mot est bien écrit ?', 'beaucoup', 'bocou', 'beaucoups'),
      q('✍️ Complète : Elles ___ heureuses.', 'sont', 'son', 'sons'),
    ],
    3: [
      q('✍️ Complète : ___ amis arrivent.', 'Leurs', 'Leur', 'L’heure'),
      q('✍️ Choisis la bonne phrase.', 'Ils se sont levés tôt.', 'Ils ce sont levés tôt.', 'Ils se son levé tôt.'),
      q('✍️ Quel mot est correctement accentué ?', 'événement', 'évènementt', 'evenement'),
      q('✍️ Complète : Les histoires qu’elle a ___.', 'racontées', 'raconté', 'raconter'),
    ],
  },
  arts: {
    1: [
      q('🎨 Bleu + jaune donnent quelle couleur ?', 'vert', 'orange', 'violet'),
      q('🎵 Quel instrument possède des touches noires et blanches ?', 'piano', 'violon', 'tambour'),
      q('🖌️ Avec quoi un peintre peut-il appliquer la peinture ?', 'pinceau', 'marteau', 'sifflet'),
      q('🥁 Quel instrument se frappe avec des baguettes ?', 'tambour', 'flûte', 'harpe'),
    ],
    2: [
      q('🎨 Rouge + bleu donnent quelle couleur ?', 'violet', 'vert', 'orange'),
      q('🎻 À quelle famille appartient le violon ?', 'cordes', 'vents', 'percussions'),
      q('🎼 Comment appelle-t-on la vitesse d’une musique ?', 'tempo', 'cadre', 'volume'),
      q('🗿 Une œuvre en trois dimensions taillée ou modelée est…', 'une sculpture', 'une chanson', 'une photographie'),
    ],
    3: [
      q('🎨 Qui a peint La Joconde ?', 'Léonard de Vinci', 'Claude Monet', 'Pablo Picasso'),
      q('🎼 Combien de temps vaut une ronde en mesure simple ?', '4 temps', '2 temps', '1 temps'),
      q('🎺 À quelle famille appartient la trompette ?', 'cuivres', 'cordes', 'percussions'),
      q('🖼️ Quel courant artistique est associé à Claude Monet ?', 'impressionnisme', 'cubisme', 'surréalisme'),
    ],
  },
};

const STANDARD_FORMATS = ['qcm', 'vrai-faux', 'image', 'association', 'saisie'];

function formatsForSubject(subjectId) {
  if (subjectId === 'histoire-geographie') return ['qcm', 'vrai-faux', 'image', 'association', 'chronologie'];
  if (subjectId === 'arts') return ['qcm', 'vrai-faux', 'image', 'association', 'classement'];
  return STANDARD_FORMATS;
}

function quotedEnglish(prompt, fallback) {
  return prompt.match(/«\s*([^»]+)\s*»/)?.[1] ?? fallback;
}

function expandQuestion(subjectId, source, sourceIndex, format, level) {
  const common = { type: subjectId, level, format };
  const standardChoices = [source.answer, ...source.distractors];
  const audioText = subjectId === 'anglais' ? quotedEnglish(source.prompt, source.answer) : null;
  if (format === 'vrai-faux') {
    const claimedAnswer = sourceIndex % 2 === 0 ? source.answer : source.distractors[0];
    return {
      ...common,
      prompt: `Vrai ou faux : pour « ${source.prompt} », la réponse est « ${claimedAnswer} ».` ,
      answer: sourceIndex % 2 === 0 ? 'Vrai' : 'Faux',
      options: ['Vrai', 'Faux'],
      audioText,
    };
  }
  if (format === 'image') {
    return { ...common, prompt: `Observe l’indice puis réponds : ${source.prompt}`, answer: source.answer, options: standardChoices, visual: subjectForId(subjectId).emoji, audioText };
  }
  if (format === 'association') {
    return { ...common, prompt: `Associe la bonne réponse : ${source.prompt}`, answer: source.answer, options: standardChoices, audioText };
  }
  if (format === 'chronologie') {
    return { ...common, prompt: `Retrouve le bon repère dans le temps : ${source.prompt}`, answer: source.answer, options: standardChoices, audioText };
  }
  if (format === 'classement') {
    return { ...common, prompt: `Classe mentalement les choix puis réponds : ${source.prompt}`, answer: source.answer, options: standardChoices, audioText };
  }
  if (format === 'saisie') {
    return { ...common, prompt: `Écris la réponse : ${source.prompt}`, answer: source.answer, inputMode: 'text', audioText };
  }
  return { ...common, prompt: source.prompt, answer: source.answer, options: standardChoices, audioText };
}

export const SUBJECT_QUESTION_BANKS = Object.fromEntries(
  Object.entries(BASE_SUBJECT_QUESTION_BANKS).map(([subjectId, levels]) => [
    subjectId,
    Object.fromEntries(Object.entries(levels).map(([level, questions]) => [
      level,
      questions.flatMap((question, sourceIndex) => formatsForSubject(subjectId).map((format) => expandQuestion(subjectId, question, sourceIndex, format, Number(level)))),
    ])),
  ])
);

function materializeQuestion(source) {
  const question = { ...source };
  if (Array.isArray(source.options)) question.options = shuffle(source.options);
  return question;
}

export function generateSubjectQuestion(subjectId, level = 1) {
  if (!subjectForId(subjectId) || !SUBJECT_QUESTION_BANKS[subjectId]) {
    throw new Error(`Matière inconnue : ${subjectId}`);
  }
  const safeLevel = Math.min(3, Math.max(1, Number(level) || 1));
  const bank = SUBJECT_QUESTION_BANKS[subjectId][safeLevel];
  const source = bank[randomInt(0, bank.length - 1)];
  return materializeQuestion(source);
}

export function generateSubjectMission(subjectId, count = 10, difficultyLevels = {}, { schoolLevel = 'CE2' } = {}) {
  if (!subjectForId(subjectId)) throw new Error(`Matière inconnue : ${subjectId}`);
  const level = difficultyForSchoolLevel(difficultyLevels[subjectId] ?? 1, schoolLevel);
  const pool = shuffle([...SUBJECT_QUESTION_BANKS[subjectId][level]]);
  const questions = [];
  while (questions.length < count) {
    const nextPool = questions.length ? shuffle([...SUBJECT_QUESTION_BANKS[subjectId][level]]) : pool;
    for (const source of nextPool) {
      if (questions.length >= count) break;
      questions.push(materializeQuestion(source));
    }
  }
  return questions;
}

export function generateSurpriseMission(enabledSubjectIds, count = 10, difficultyLevels = {}, options = {}) {
  const subjects = surpriseSubjectIds(enabledSubjectIds, 3);
  if (!subjects.length) return [];
  const perSubject = Object.fromEntries(subjects.map((subjectId) => [subjectId, generateSubjectMission(subjectId, count, difficultyLevels, options)]));
  return shuffle(Array.from({ length: count }, (_, index) => perSubject[subjects[index % subjects.length]][index]));
}
