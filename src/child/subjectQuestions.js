import { randomInt, shuffle } from './random.js';
import { subjectForId } from '../shared/subjects.js';
import { difficultyForSchoolLevel, surpriseSubjectIds } from '../shared/learningExperience.js';
import { SUPPLEMENTAL_SUBJECT_FACTS } from './supplementalSubjectFacts.js';

const q = (prompt, answer, distractorA, distractorB) => ({ prompt, answer, distractors: [distractorA, distractorB] });

const BASE_SUBJECT_QUESTION_BANKS = {
  anglais: {
    1: [
      q('🇬🇧 Que veut dire « cat » ?', 'chat', 'chien', 'lapin'),
      q('🇬🇧 Que veut dire « blue » ?', 'bleu', 'rouge', 'vert'),
      q('🇬🇧 Quel mot signifie « trois » ?', 'three', 'tree', 'thirteen'),
      q('🇬🇧 Que veut dire « hello » ?', 'bonjour', 'au revoir', 'merci'),
      q('🇬🇧 Que veut dire « dog » ?', 'chien', 'chat', 'oiseau'),
      q('🇬🇧 Que veut dire « red » ?', 'rouge', 'bleu', 'jaune'),
      q('🇬🇧 Quel mot signifie « merci » ?', 'thank you', 'hello', 'goodbye'),
      q('🇬🇧 Que veut dire « school » ?', 'école', 'maison', 'jardin'),
      q('🇬🇧 Quel mot signifie « soleil » ?', 'sun', 'moon', 'star'),
      q('🇬🇧 Que veut dire « happy » ?', 'heureux', 'fatigué', 'triste'),
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
      q('☀️ Le Soleil est…', 'une étoile', 'une planète', 'un satellite'),
      q('📅 Combien de jours compte une semaine ?', '7', '5', '10'),
      q('🐝 Que fabriquent les abeilles ?', 'du miel', 'du lait', 'du pain'),
      q('🗼 Dans quelle ville se trouve la tour Eiffel ?', 'Paris', 'Londres', 'Rome'),
      q('🍂 Combien y a-t-il de saisons ?', '4', '3', '5'),
      q('🌎 La Terre est…', 'une planète', 'une étoile', 'une comète'),
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
      q('👂 Avec quel organe entend-on ?', 'les oreilles', 'les yeux', 'les mains'),
      q('🐟 Où vit un poisson ?', 'dans l’eau', 'dans le sable', 'dans un arbre'),
      q('🌙 La Lune est le satellite de…', 'la Terre', 'Mars', 'Vénus'),
      q('🦜 De quoi le corps des oiseaux est-il couvert ?', 'de plumes', 'de poils', 'd’écailles'),
      q('💓 Quel organe bat dans notre poitrine ?', 'le cœur', 'le foie', 'l’estomac'),
      q('💡 De quoi a-t-on besoin pour former une ombre ?', 'de lumière', 'de musique', 'de vent'),
      q('🩸 Quel organe agit comme une pompe pour faire circuler le sang ?', 'le cœur', 'les poumons', 'l’estomac'),
      q('🫁 Quels organes se remplissent d’air quand nous respirons ?', 'les poumons', 'les reins', 'les oreilles'),
      q('🧠 Quel organe nous permet de penser et de mémoriser ?', 'le cerveau', 'le cœur', 'l’estomac'),
      q('🍎 Dans quel organe les aliments arrivent-ils après avoir été avalés ?', 'l’estomac', 'les poumons', 'la vessie'),
      q('🦴 Comment appelle-t-on l’ensemble des os du corps ?', 'le squelette', 'la peau', 'le sang'),
      q('💪 Qu’est-ce qui permet à notre corps de bouger ?', 'les muscles', 'les cheveux', 'les ongles'),
      q('🦷 À quoi servent principalement les dents ?', 'à mâcher', 'à respirer', 'à entendre'),
      q('👅 Avec quelle partie de la bouche reconnaît-on les goûts ?', 'la langue', 'les dents', 'les lèvres'),
      q('👃 Quel organe permet de sentir les odeurs ?', 'le nez', 'la langue', 'les oreilles'),
      q('🖐️ Qu’est-ce qui recouvre et protège tout notre corps ?', 'la peau', 'le sang', 'les muscles'),
      q('💪 Quelle articulation permet de plier le bras ?', 'le coude', 'le genou', 'la cheville'),
      q('🦵 Quelle articulation permet de plier la jambe ?', 'le genou', 'le poignet', 'le coude'),
      q('✋ Combien de doigts compte généralement une main ?', '5', '4', '6'),
      q('🦶 Combien d’orteils compte généralement un pied ?', '5', '3', '7'),
      q('👶 Combien un enfant possède-t-il généralement de dents de lait ?', '20', '10', '32'),
    ],
    2: [
      q('🫁 Quel organe nous aide à respirer ?', 'les poumons', 'l’estomac', 'les reins'),
      q('🦋 Comment appelle-t-on le changement de la chenille en papillon ?', 'métamorphose', 'évaporation', 'germination'),
      q('☁️ Quand l’eau liquide devient vapeur, c’est…', 'l’évaporation', 'la fusion', 'la congélation'),
      q('🧲 Quel matériau est attiré par un aimant ?', 'fer', 'bois', 'verre'),
      q('🦴 Combien d’os compte environ le squelette d’un adulte ?', '206', '106', '306'),
      q('🖐️ Quel est le plus grand organe du corps humain ?', 'la peau', 'le cœur', 'le cerveau'),
      q('💀 Quelle partie du squelette protège le cerveau ?', 'le crâne', 'le bassin', 'le fémur'),
      q('🫀 Quelle cage osseuse protège le cœur et les poumons ?', 'la cage thoracique', 'le bassin', 'la mâchoire'),
      q('🫁 Quel muscle situé sous les poumons aide à respirer ?', 'le diaphragme', 'le biceps', 'le mollet'),
      q('🍞 Où commence la digestion des aliments ?', 'dans la bouche', 'dans les poumons', 'dans la vessie'),
      q('🥗 Dans quel organe la majorité des nutriments passe-t-elle dans le sang ?', 'l’intestin grêle', 'le gros intestin', 'l’œsophage'),
      q('💧 Quel organe récupère notamment une partie de l’eau restante après la digestion ?', 'le gros intestin', 'le cœur', 'la trachée'),
      q('🫘 Quels organes filtrent le sang et fabriquent l’urine ?', 'les reins', 'les poumons', 'les yeux'),
      q('🚰 Quel organe stocke l’urine avant son élimination ?', 'la vessie', 'l’estomac', 'le foie'),
      q('🩸 Quels vaisseaux transportent le sang en partant du cœur ?', 'les artères', 'les veines', 'les nerfs'),
      q('🩸 Quels vaisseaux ramènent le sang vers le cœur ?', 'les veines', 'les artères', 'les bronches'),
      q('💓 Que mesure-t-on lorsque l’on prend son pouls ?', 'les battements du cœur', 'la taille des poumons', 'la longueur des os'),
      q('😋 Quel liquide de la bouche commence à transformer les aliments ?', 'la salive', 'le sang', 'la sueur'),
      q('🦴 Comment appelle-t-on la zone où deux os se rejoignent ?', 'une articulation', 'un muscle', 'un organe'),
    ],
    3: [
      q('☀️ Quelle planète est la plus proche du Soleil ?', 'Mercure', 'Vénus', 'Mars'),
      q('🌿 Quel gaz les plantes absorbent-elles principalement ?', 'dioxyde de carbone', 'oxygène', 'hélium'),
      q('🩸 Quel organe fait circuler le sang ?', 'le cœur', 'le foie', 'le cerveau'),
      q('♻️ Quel déchet peut généralement être recyclé ?', 'bouteille en verre', 'mouchoir sale', 'reste de repas'),
      q('🫁 Dans quelles petites poches pulmonaires ont lieu les échanges de gaz ?', 'les alvéoles', 'les bronches', 'les reins'),
      q('🫀 Combien de cavités possède le cœur humain ?', '4', '2', '6'),
      q('🧠 Quelle cellule transmet les messages dans le système nerveux ?', 'le neurone', 'le globule rouge', 'la plaquette'),
      q('🧠 Quelle structure relie le cerveau aux nerfs du corps ?', 'la moelle épinière', 'l’œsophage', 'la trachée'),
      q('⚖️ Quelle partie du cerveau participe beaucoup à l’équilibre et à la coordination ?', 'le cervelet', 'l’estomac', 'le sternum'),
      q('🩸 Quelles cellules transportent principalement l’oxygène dans le sang ?', 'les globules rouges', 'les globules blancs', 'les plaquettes'),
      q('🛡️ Quelles cellules aident à défendre le corps contre les microbes ?', 'les globules blancs', 'les globules rouges', 'les cellules osseuses'),
      q('🩹 Quels éléments du sang participent à la formation d’un caillot ?', 'les plaquettes', 'les neurones', 'les alvéoles'),
      q('🍽️ Quel conduit transporte les aliments de la bouche vers l’estomac ?', 'l’œsophage', 'la trachée', 'l’urètre'),
      q('🟤 Quel organe fabrique la bile utile à la digestion des graisses ?', 'le foie', 'le cœur', 'la vessie'),
      q('🧪 Quel organe fabrique notamment l’insuline ?', 'le pancréas', 'le poumon', 'le rein'),
      q('💪 Que fait un muscle pour produire un mouvement ?', 'il se contracte', 'il se transforme en os', 'il se remplit d’air'),
      q('🦴 Quel tissu relie généralement un muscle à un os ?', 'un tendon', 'un nerf', 'une veine'),
      q('🦴 Quel tissu relie un os à un autre au niveau d’une articulation ?', 'un ligament', 'un tendon', 'un globule'),
      q('💉 À quoi sert un vaccin ?', 'à préparer les défenses immunitaires', 'à remplacer les os', 'à accélérer la digestion'),
    ],
  },
  'histoire-geographie': {
    1: [
      q('🗺️ Sur quel continent se trouve la France ?', 'Europe', 'Afrique', 'Asie'),
      q('🏰 Qui vivait souvent dans un château fort ?', 'un seigneur', 'un astronaute', 'un pharaon'),
      q('🌊 Comment appelle-t-on une grande étendue d’eau salée ?', 'un océan', 'une forêt', 'une montagne'),
      q('🧭 Sur une carte classique, où se trouve le nord ?', 'en haut', 'en bas', 'à droite'),
      q('🌐 Quel objet représente la Terre en boule ?', 'un globe', 'une règle', 'une boussole'),
      q('🏝️ Une terre entourée d’eau est…', 'une île', 'une vallée', 'un désert'),
      q('🏘️ Un petit groupe de maisons à la campagne est…', 'un village', 'un océan', 'un continent'),
      q('🚩 Que représente souvent un drapeau ?', 'un pays', 'une saison', 'une rivière'),
      q('🦕 Quelle période vient avant l’Histoire écrite ?', 'la Préhistoire', 'le Moyen Âge', 'les Temps modernes'),
      q('🏞️ Un cours d’eau qui se jette dans la mer est…', 'un fleuve', 'une montagne', 'une route'),
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
      q('🧩 Complète la suite : 1, 3, 5, …', '7', '6', '8'),
      q('🔎 Trouve l’intrus : rouge, bleu, banane.', 'banane', 'rouge', 'bleu'),
      q('🧠 Si Tom est avant Lina, qui est derrière ?', 'Lina', 'Tom', 'personne'),
      q('🔢 Quel nombre vient juste avant 10 ?', '9', '8', '11'),
      q('🔷 Complète : △ ○ △ ○ …', '△', '○', '□'),
      q('🧩 Deux paires de chaussettes font combien de chaussettes ?', '4', '2', '6'),
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
      q('✍️ Quel mot est bien écrit ?', 'école', 'écolle', 'ékole'),
      q('✍️ Complète : un ___ bleu.', 'ballon', 'ballons', 'balon'),
      q('✍️ Quel mot se termine par la lettre e ?', 'table', 'chat', 'vélo'),
      q('✍️ Complète : La fille est ___.', 'grande', 'grand', 'grands'),
      q('✍️ Quel mot est bien écrit ?', 'jardin', 'jardain', 'jarddin'),
      q('✍️ Choisis la phrase correcte.', 'Le chien court.', 'le chien court.', 'Le chien cour.'),
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
      q('🎨 Rouge + jaune donnent quelle couleur ?', 'orange', 'vert', 'violet'),
      q('🎵 Quel instrument possède des cordes et un archet ?', 'violon', 'piano', 'trompette'),
      q('🖍️ Avec quoi peut-on colorier un dessin ?', 'des crayons', 'une fourchette', 'un marteau'),
      q('🎤 Quel objet utilise souvent un chanteur ?', 'un micro', 'une règle', 'une boussole'),
      q('🩰 Quel art consiste à danser sur une musique ?', 'la danse', 'la sculpture', 'la photographie'),
      q('⚫ Quelle couleur obtient-on en mélangeant beaucoup de couleurs sombres ?', 'noir', 'blanc', 'jaune'),
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
  const common = { type: subjectId, level, format, sourceId: `${subjectId}-${level}-${sourceIndex}` };
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
      [...questions, ...(SUPPLEMENTAL_SUBJECT_FACTS[subjectId]?.[level] ?? []).map(([prompt, answer, distractorA, distractorB]) => q(prompt, answer, distractorA, distractorB))]
        .flatMap((question, sourceIndex) => formatsForSubject(subjectId).map((format) => expandQuestion(subjectId, question, sourceIndex, format, Number(level)))),
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
  const pool = shuffle(Array.from({ length: level }, (_, index) => SUBJECT_QUESTION_BANKS[subjectId][index + 1]).flat());
  const groups = new Map();
  pool.forEach((question) => {
    if (!groups.has(question.sourceId)) groups.set(question.sourceId, []);
    groups.get(question.sourceId).push(question);
  });
  const uniqueSources = shuffle([...groups.values()]);
  const questions = [];
  while (questions.length < count) {
    const nextPool = questions.length ? shuffle(uniqueSources) : uniqueSources;
    for (const variants of nextPool) {
      if (questions.length >= count) break;
      const source = variants[randomInt(0, variants.length - 1)];
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
