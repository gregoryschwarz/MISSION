// Personnalisation de l'avatar enfant : personnages, chapeaux, capes et décors
// de fond. Voir docs/cahier-des-charges.md ("Avatar personnalisable : 9
// personnages + accessoires (chapeaux 🎩 & capes ✨) + 8 décors colorés en fond").

// `cost` = deuxième voie de déblocage : un personnage encore hors de portée
// niveau peut être acheté directement avec des pièces (comme sur les
// maquettes de référence, ex. médaillon verrouillé "🔒 80").
export const CHARACTERS = [
  { id: 'unicorn', name: 'Luna aventurière', emoji: '🦄', skin: '#f2c7a5', hair: '#5b2d90', outfit: '#ff5fa2', accent: '#ffe066', requiredLevel: 1, cost: 0 },
  { id: 'butterfly', name: 'Nova astronaute', emoji: '🦋', skin: '#9b5f3f', hair: '#241c2b', outfit: '#f5f7ff', accent: '#6c63ff', requiredLevel: 2, cost: 20 },
  { id: 'cat', name: 'Kira ninja', emoji: '🐱', skin: '#d99b72', hair: '#17151e', outfit: '#343047', accent: '#ff4d6d', requiredLevel: 3, cost: 30 },
  { id: 'dog', name: 'Milo sportif', emoji: '🐶', skin: '#f0b98d', hair: '#7a431f', outfit: '#20b486', accent: '#ffffff', requiredLevel: 4, cost: 40 },
  { id: 'fox', name: 'Zélie exploratrice', emoji: '🦊', skin: '#e8ad83', hair: '#d45b32', outfit: '#f2a93b', accent: '#315f49', requiredLevel: 5, cost: 50 },
  { id: 'panda', name: 'Aya magicienne', emoji: '🐼', skin: '#70402f', hair: '#251713', outfit: '#7656c8', accent: '#ffd166', requiredLevel: 6, cost: 60 },
  { id: 'lion', name: 'Léo chevalier', emoji: '🦁', skin: '#c9855d', hair: '#8b4d20', outfit: '#718096', accent: '#3c91e6', requiredLevel: 7, cost: 70 },
  { id: 'koala', name: 'Lou scientifique', emoji: '🐨', skin: '#f4c9a8', hair: '#c89b6d', outfit: '#e8f5ff', accent: '#00a6a6', requiredLevel: 8, cost: 80 },
  { id: 'dragon', name: 'Sasha pirate', emoji: '🐉', skin: '#8f563d', hair: '#151515', outfit: '#b23a48', accent: '#f4d35e', requiredLevel: 9, cost: 100 },
];

const MASTERY_BADGE_IDS = [
  'mastery-addition',
  'mastery-soustraction',
  'mastery-multiplication',
  'mastery-comparaison',
  'mastery-division',
  'mastery-fraction',
  'mastery-geometrie',
  'mastery-monnaie',
  'mastery-longueur',
  'mastery-temps',
  'mastery-probleme',
  'mastery-accord-pluriel',
];

// "Aucun" est toujours en tête de liste et toujours débloqué : requiresAnyOf
// vide = pas de condition (voir isUnlockedByBadge ci-dessous).
export const HATS = [
  { id: 'none-hat', name: 'Aucun chapeau', emoji: null, requiresAnyOf: [] },
  { id: 'crown', name: 'Couronne', emoji: '👑', requiresAnyOf: ['streak-30'] },
  { id: 'top-hat', name: 'Haut-de-forme', emoji: '🎩', requiresAnyOf: MASTERY_BADGE_IDS },
  { id: 'flower-crown', name: 'Couronne de fleurs', emoji: '🌸', requiresAnyOf: ['perfect-1'] },
  { id: 'round-glasses', name: 'Lunettes rondes', emoji: '👓', requiresAnyOf: [], requiredLevel: 2 },
  { id: 'cat-ears', name: 'Oreilles de chat', emoji: '🐱', requiresAnyOf: [], requiredLevel: 3 },
  { id: 'headphones', name: 'Casque musique', emoji: '🎧', requiresAnyOf: [], requiredLevel: 4 },
  { id: 'sports-cap', name: 'Casquette sportive', emoji: '🧢', requiresAnyOf: [], requiredLevel: 5 },
  { id: 'star-glasses', name: 'Lunettes étoiles', emoji: '🤩', requiresAnyOf: ['streak-3'] },
  { id: 'wizard-hat', name: 'Chapeau magique', emoji: '🧙', requiresAnyOf: ['perfect-10'] },
  { id: 'pirate-hat', name: 'Chapeau pirate', emoji: '🏴‍☠️', requiresAnyOf: [], requiredLevel: 7 },
  { id: 'tiara', name: 'Diadème', emoji: '💎', requiresAnyOf: ['perfect-50'] },
];

export const CAPES = [
  { id: 'none-cape', name: 'Aucune cape', emoji: null, requiresAnyOf: [] },
  { id: 'star-cape', name: 'Cape étoilée', emoji: '⭐', requiresAnyOf: ['streak-7'] },
  { id: 'rainbow-cape', name: 'Cape arc-en-ciel', emoji: '🌈', requiresAnyOf: ['perfect-10'] },
  { id: 'diamond-cape', name: 'Cape de diamant', emoji: '💎', requiresAnyOf: ['perfect-50'] },
  { id: 'backpack', name: 'Sac d’aventurière', emoji: '🎒', requiresAnyOf: [], requiredLevel: 2 },
  { id: 'fairy-wings', name: 'Ailes de fée', emoji: '🧚', requiresAnyOf: ['perfect-1'] },
  { id: 'angel-wings', name: 'Ailes célestes', emoji: '🪽', requiresAnyOf: [], requiredLevel: 5 },
  { id: 'dragon-wings', name: 'Ailes de dragon', emoji: '🐲', requiresAnyOf: [], requiredLevel: 7 },
  { id: 'jetpack', name: 'Jet-pack', emoji: '🚀', requiresAnyOf: ['mastery-temps'] },
  { id: 'magic-shield', name: 'Bouclier magique', emoji: '🛡️', requiresAnyOf: ['streak-30'] },
  { id: 'cloud-friend', name: 'Petit nuage', emoji: '☁️', requiresAnyOf: ['perfect-10'] },
  { id: 'star-friend', name: 'Étoile amie', emoji: '🌟', requiresAnyOf: [], requiredLevel: 9 },
];

export const HAIRSTYLES = [
  { id: 'original-hair', name: 'Coiffure du personnage', emoji: '✨', color: null, requiredLevel: 1 },
  { id: 'soft-bob', name: 'Carré doux', emoji: '💇', color: '#5b2d90', requiredLevel: 1 },
  { id: 'high-ponytail', name: 'Queue haute', emoji: '🎀', color: '#6b3e26', requiredLevel: 2 },
  { id: 'curly', name: 'Boucles', emoji: '➰', color: '#3b2417', requiredLevel: 2 },
  { id: 'side-braids', name: 'Tresses', emoji: '🪢', color: '#2b1b16', requiredLevel: 3 },
  { id: 'pixie', name: 'Coupe courte', emoji: '⭐', color: '#c85a34', requiredLevel: 3 },
  { id: 'afro', name: 'Nuage bouclé', emoji: '☁️', color: '#271914', requiredLevel: 4 },
  { id: 'double-buns', name: 'Deux macarons', emoji: '🍡', color: '#7d3c98', requiredLevel: 4 },
  { id: 'long-waves', name: 'Longues vagues', emoji: '🌊', color: '#c47a32', requiredLevel: 5 },
  { id: 'mohawk', name: 'Crête colorée', emoji: '⚡', color: '#00a6a6', requiredLevel: 6 },
  { id: 'space-buns', name: 'Macarons cosmiques', emoji: '🪐', color: '#3846a8', requiredLevel: 7 },
  { id: 'rainbow-hair', name: 'Cheveux arc-en-ciel', emoji: '🌈', color: '#ef476f', requiredLevel: 9 },
  { id: 'midnight-waves', name: 'Vagues de minuit', emoji: '🌙', color: '#352b57', requiredLevel: 6 },
  { id: 'snow-braids', name: 'Tresses enneigées', emoji: '❄️', color: '#d9efff', requiredLevel: 6 },
  { id: 'pixel-spikes', name: 'Pics pixel', emoji: '🟦', color: '#2563a8', requiredLevel: 7 },
  { id: 'starlight-ponytail', name: 'Queue lumière d’étoile', emoji: '🌟', color: '#7c4dcc', requiredLevel: 9 },
];

export const OUTFITS = [
  { id: 'original-outfit', name: 'Tenue du personnage', emoji: '✨', outfit: null, accent: null, requiredLevel: 1 },
  { id: 'school', name: 'École', emoji: '📚', outfit: '#315f8c', accent: '#f7d154', requiredLevel: 1 },
  { id: 'sport', name: 'Sport', emoji: '🏅', outfit: '#20b486', accent: '#ffffff', requiredLevel: 1 },
  { id: 'artist', name: 'Artiste', emoji: '🎨', outfit: '#f5eee4', accent: '#ef476f', requiredLevel: 2 },
  { id: 'scientist', name: 'Scientifique', emoji: '🔬', outfit: '#e8f5ff', accent: '#00a6a6', requiredLevel: 2 },
  { id: 'explorer', name: 'Exploratrice', emoji: '🧭', outfit: '#d98b3a', accent: '#315f49', requiredLevel: 3 },
  { id: 'ninja', name: 'Ninja', emoji: '🥷', outfit: '#343047', accent: '#ff4d6d', requiredLevel: 3 },
  { id: 'dancer', name: 'Danseuse', emoji: '🩰', outfit: '#f6a6c1', accent: '#fff0f5', requiredLevel: 4 },
  { id: 'chef', name: 'Cheffe', emoji: '🧁', outfit: '#fff7e8', accent: '#e85d75', requiredLevel: 4 },
  { id: 'gardener', name: 'Jardinière', emoji: '🌱', outfit: '#6aa84f', accent: '#ffe599', requiredLevel: 5 },
  { id: 'superhero', name: 'Super-héroïne', emoji: '⚡', outfit: '#3157a4', accent: '#ffd43b', requiredLevel: 5 },
  { id: 'astronaut', name: 'Astronaute', emoji: '🚀', outfit: '#f5f7ff', accent: '#6c63ff', requiredLevel: 6 },
  { id: 'magician', name: 'Magicienne', emoji: '🔮', outfit: '#7656c8', accent: '#ffd166', requiredLevel: 6 },
  { id: 'knight', name: 'Chevalière', emoji: '🛡️', outfit: '#718096', accent: '#3c91e6', requiredLevel: 7 },
  { id: 'pirate', name: 'Pirate', emoji: '⚓', outfit: '#b23a48', accent: '#f4d35e', requiredLevel: 7 },
  { id: 'mermaid', name: 'Sirène', emoji: '🧜‍♀️', outfit: '#20bfc1', accent: '#d8b4fe', requiredLevel: 8 },
  { id: 'royal', name: 'Royale', emoji: '👑', outfit: '#a855f7', accent: '#fde68a', requiredLevel: 8 },
  { id: 'dragon-rider', name: 'Dresseuse de dragon', emoji: '🐲', outfit: '#315f49', accent: '#ff7b54', requiredLevel: 9 },
  { id: 'galaxy', name: 'Galaxie', emoji: '🌌', outfit: '#27265b', accent: '#8be9fd', requiredLevel: 10 },
  { id: 'rainbow', name: 'Arc-en-ciel', emoji: '🌈', outfit: '#ef476f', accent: '#ffd166', requiredLevel: 12 },
  { id: 'witch', name: 'Petite sorcière', emoji: '🧹', outfit: '#3d2c5f', accent: '#ff9f1c', requiredLevel: 6 },
  { id: 'pumpkin', name: 'Citrouille malicieuse', emoji: '🎃', outfit: '#e76f18', accent: '#32213a', requiredLevel: 6 },
  { id: 'winter-elf', name: 'Lutine de Noël', emoji: '🎄', outfit: '#237a4b', accent: '#e63946', requiredLevel: 6 },
  { id: 'snow-queen', name: 'Reine des neiges', emoji: '❄️', outfit: '#9adcf8', accent: '#f7fbff', requiredLevel: 6 },
  { id: 'cube-builder', name: 'Bâtisseuse cubique', emoji: '🧱', outfit: '#3273b8', accent: '#ffd43b', requiredLevel: 7 },
  { id: 'neon-block', name: 'Exploratrice néon', emoji: '💠', outfit: '#29284f', accent: '#3ee7c2', requiredLevel: 7 },
  { id: 'pop-guardian', name: 'Gardienne pop', emoji: '🎤', outfit: '#6d3fc0', accent: '#ff6cae', requiredLevel: 9 },
  { id: 'moon-dancer', name: 'Danseuse lunaire', emoji: '🌙', outfit: '#253465', accent: '#9ce6ff', requiredLevel: 9 },
];

export const COMPANIONS = [
  { id: 'none-companion', name: 'Sans compagnon', emoji: null, requiredLevel: 1 },
  { id: 'cat-companion', name: 'Mimi le chat', emoji: '🐱', requiredLevel: 1 },
  { id: 'dog-companion', name: 'Pixel le chien', emoji: '🐶', requiredLevel: 2 },
  { id: 'fox-companion', name: 'Flamme le renard', emoji: '🦊', requiredLevel: 3 },
  { id: 'panda-companion', name: 'Bambou le panda', emoji: '🐼', requiredLevel: 4 },
  { id: 'owl-companion', name: 'Plume le hibou', emoji: '🦉', requiredLevel: 5 },
  { id: 'axolotl-companion', name: 'Bulle l’axolotl', emoji: '🦎', requiredLevel: 6 },
  { id: 'unicorn-companion', name: 'Étoile la licorne', emoji: '🦄', requiredLevel: 8 },
  { id: 'dragon-companion', name: 'Drago le dragon', emoji: '🐉', requiredLevel: 10 },
  { id: 'bat-companion', name: 'Vampy la chauve-souris', emoji: '🦇', requiredLevel: 6 },
  { id: 'reindeer-companion', name: 'Flocon le renne', emoji: '🦌', requiredLevel: 6 },
  { id: 'cube-companion', name: 'Cubi le petit bloc', emoji: '🧊', requiredLevel: 7 },
  { id: 'comet-companion', name: 'Comète la lumière', emoji: '☄️', requiredLevel: 9 },
];

export const COMPANION_ACCESSORIES = [
  { id: 'none-pet-accessory', name: 'Aucun accessoire', emoji: null, requiredLevel: 1 },
  { id: 'pet-bow', name: 'Petit nœud', emoji: '🎀', requiredLevel: 1 },
  { id: 'pet-flower', name: 'Fleur', emoji: '🌸', requiredLevel: 2 },
  { id: 'pet-glasses', name: 'Lunettes', emoji: '🕶️', requiredLevel: 3 },
  { id: 'pet-scarf', name: 'Foulard', emoji: '🧣', requiredLevel: 4 },
  { id: 'pet-cap', name: 'Casquette', emoji: '🧢', requiredLevel: 5 },
  { id: 'pet-headphones', name: 'Mini casque', emoji: '🎧', requiredLevel: 6 },
  { id: 'pet-star', name: 'Étoile magique', emoji: '⭐', requiredLevel: 7 },
  { id: 'pet-crown', name: 'Petite couronne', emoji: '👑', requiredLevel: 8 },
  { id: 'pet-wings', name: 'Petites ailes', emoji: '🪽', requiredLevel: 9 },
  { id: 'pet-magic-hat', name: 'Chapeau magique', emoji: '🧙', requiredLevel: 10 },
  { id: 'pet-pumpkin', name: 'Mini citrouille', emoji: '🎃', requiredLevel: 6 },
  { id: 'pet-santa-hat', name: 'Bonnet de Noël', emoji: '🎅', requiredLevel: 6 },
  { id: 'pet-brick', name: 'Mini brique', emoji: '🧱', requiredLevel: 7 },
  { id: 'pet-music', name: 'Note enchantée', emoji: '🎵', requiredLevel: 9 },
];

// Catalogue extensible : un pack détermine à la fois le niveau d'accès, le
// prix et les objets acquis définitivement. Ajouter un pack revient à ajouter
// une entrée ici puis les objets correspondants dans les collections ci-dessus.
export const AVATAR_PACKS = [
  {
    id: 'starter-pack', name: 'Premiers styles', emoji: '🎒', requiredLevel: 1, cost: 0,
    description: 'Les indispensables pour commencer à créer ton style.',
    itemIds: ['original-hair', 'soft-bob', 'original-outfit', 'school', 'sport', 'none-companion', 'cat-companion', 'none-pet-accessory', 'pet-bow'],
  },
  {
    id: 'creative-pack', name: 'Studio créatif', emoji: '🎨', requiredLevel: 3, cost: 60,
    description: 'Couleurs, danse et imagination avec Bambou.',
    itemIds: ['curly', 'artist', 'dancer', 'panda-companion', 'pet-flower'],
  },
  {
    id: 'ninja-pack', name: 'Équipe secrète', emoji: '🥷', requiredLevel: 4, cost: 85,
    description: 'Un style rapide et courageux avec Pixel.',
    itemIds: ['pixie', 'ninja', 'superhero', 'dog-companion', 'pet-glasses'],
  },
  {
    id: 'adventure-pack', name: 'Grande aventure', emoji: '🧭', requiredLevel: 5, cost: 110,
    description: 'Pars explorer avec Flamme et Plume.',
    itemIds: ['high-ponytail', 'side-braids', 'long-waves', 'explorer', 'gardener', 'fox-companion', 'owl-companion', 'pet-scarf', 'pet-cap'],
  },
  {
    id: 'science-pack', name: 'Labo rigolo', emoji: '🔬', requiredLevel: 6, cost: 140,
    description: 'Des expériences et un compagnon aquatique étonnant.',
    itemIds: ['afro', 'scientist', 'chef', 'axolotl-companion', 'pet-headphones'],
  },
  {
    id: 'magic-pack', name: 'Monde magique', emoji: '🔮', requiredLevel: 8, cost: 180,
    description: 'Magie, sirène et licorne pour rêver en grand.',
    itemIds: ['double-buns', 'magician', 'mermaid', 'unicorn-companion', 'pet-star', 'pet-crown'],
  },
  {
    id: 'space-pack', name: 'Mission espace', emoji: '🚀', requiredLevel: 10, cost: 220,
    description: 'Deux coiffures cosmiques et des tenues de galaxie.',
    itemIds: ['mohawk', 'space-buns', 'astronaut', 'galaxy'],
  },
  {
    id: 'royal-pack', name: 'Palais royal', emoji: '👑', requiredLevel: 12, cost: 280,
    description: 'Des styles rares pour chevalières, pirates et reines.',
    itemIds: ['rainbow-hair', 'knight', 'pirate', 'royal'],
  },
  {
    id: 'legendary-pack', name: 'Dragon légendaire', emoji: '🐉', requiredLevel: 15, cost: 400,
    description: 'Le pack ultime avec Drago et les objets arc-en-ciel.',
    itemIds: ['dragon-rider', 'rainbow', 'dragon-companion', 'pet-wings', 'pet-magic-hat'],
  },
  {
    id: 'halloween-pack', name: 'Halloween enchanté', emoji: '🎃', requiredLevel: 6, cost: 150, seasonal: true,
    description: 'Sorcière, citrouille et Vampy pour une fête pleine de malice.',
    itemIds: ['midnight-waves', 'witch', 'pumpkin', 'bat-companion', 'pet-pumpkin'],
  },
  {
    id: 'christmas-pack', name: 'Noël merveilleux', emoji: '🎄', requiredLevel: 6, cost: 150, seasonal: true,
    description: 'Des tresses enneigées et Flocon le renne pour les fêtes.',
    itemIds: ['snow-braids', 'winter-elf', 'snow-queen', 'reindeer-companion', 'pet-santa-hat'],
  },
  {
    id: 'cube-adventure-pack', name: 'Aventure cubique', emoji: '🧊', requiredLevel: 7, cost: 170, originalVariant: true,
    description: 'Un univers de blocs lumineux avec Cubi, notre compagnon original.',
    itemIds: ['pixel-spikes', 'cube-builder', 'neon-block', 'cube-companion', 'pet-brick'],
  },
  {
    id: 'mystic-idols-pack', name: 'Idoles mystiques', emoji: '🎤', requiredLevel: 9, cost: 210, originalVariant: true,
    description: 'Deux héroïnes pop magiques accompagnées de Comète.',
    itemIds: ['starlight-ponytail', 'pop-guardian', 'moon-dancer', 'comet-companion', 'pet-music'],
  },
];

// 8 décors en fond dégradé (noms fixés par le cahier des charges), déverrouillés
// par palier de niveau d'avatar comme les personnages.
export const DECORS = [
  { id: 'menthe', name: 'Menthe', gradient: ['#06d6a0', '#04b98b'], requiredLevel: 1 },
  { id: 'creme', name: 'Crème', gradient: ['#fff9f2', '#ffe0b3'], requiredLevel: 2 },
  { id: 'soleil', name: 'Soleil', gradient: ['#ffd166', '#ffb84d'], requiredLevel: 3 },
  { id: 'corail', name: 'Corail', gradient: ['#f25f5c', '#ff8a80'], requiredLevel: 4 },
  { id: 'foret', name: 'Forêt', gradient: ['#2e7d32', '#8cb369'], requiredLevel: 5 },
  { id: 'bonbon', name: 'Bonbon', gradient: ['#ef476f', '#ffb8e6'], requiredLevel: 6 },
  { id: 'arc-en-ciel', name: 'Arc-en-ciel', gradient: ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'], requiredLevel: 7 },
  { id: 'nuit-etoilee', name: 'Nuit étoilée', gradient: ['#1d1e2c', '#3a3d5c'], requiredLevel: 8 },
];

export const DEFAULT_CHARACTER = 'unicorn';
export const DEFAULT_HAT = 'none-hat';
export const DEFAULT_CAPE = 'none-cape';
export const DEFAULT_DECOR = 'menthe';
export const DEFAULT_HAIRSTYLE = 'original-hair';
export const DEFAULT_OUTFIT = 'original-outfit';
export const DEFAULT_COMPANION = 'none-companion';
export const DEFAULT_COMPANION_ACCESSORY = 'none-pet-accessory';
export const DEFAULT_OWNED_PACK_IDS = ['starter-pack'];

// Un accessoire sans condition (requiresAnyOf vide, ex. "aucun") est toujours
// débloqué ; sinon il faut au moins un des badges listés.
function isUnlockedByBadge(item, badges, avatarLevel = 1) {
  if (item.requiredLevel && avatarLevel < item.requiredLevel) return false;
  if (item.requiresAnyOf.length === 0) return true;
  return item.requiresAnyOf.some((id) => badges.includes(id));
}

// Un personnage est débloqué soit par niveau, soit parce qu'il a été acheté
// avec des pièces (ownedCharacterIds) — les deux voies coexistent.
export function unlockedCharacters(avatarLevel, ownedCharacterIds = []) {
  return CHARACTERS.filter((c) => avatarLevel >= c.requiredLevel || ownedCharacterIds.includes(c.id));
}

export function unlockedHats(badges, avatarLevel = 1) {
  return HATS.filter((h) => isUnlockedByBadge(h, badges, avatarLevel));
}

export function unlockedCapes(badges, avatarLevel = 1) {
  return CAPES.filter((c) => isUnlockedByBadge(c, badges, avatarLevel));
}

export function unlockedDecors(avatarLevel) {
  return DECORS.filter((d) => avatarLevel >= d.requiredLevel);
}

export function characterMedallionData(avatarLevel, ownedCharacterIds = []) {
  const unlockedIds = unlockedCharacters(avatarLevel, ownedCharacterIds).map((c) => c.id);
  return CHARACTERS.map((c) => ({ ...c, unlocked: unlockedIds.includes(c.id) }));
}

export function hatMedallionData(badges, avatarLevel = 1) {
  const unlockedIds = unlockedHats(badges, avatarLevel).map((h) => h.id);
  return HATS.map((h) => ({ ...h, unlocked: unlockedIds.includes(h.id) }));
}

export function capeMedallionData(badges, avatarLevel = 1) {
  const unlockedIds = unlockedCapes(badges, avatarLevel).map((c) => c.id);
  return CAPES.map((c) => ({ ...c, unlocked: unlockedIds.includes(c.id) }));
}

export function decorMedallionData(avatarLevel) {
  const unlockedIds = unlockedDecors(avatarLevel).map((d) => d.id);
  return DECORS.map((d) => ({ ...d, unlocked: unlockedIds.includes(d.id) }));
}

export function emojiForCharacter(characterId) {
  const found = CHARACTERS.find((c) => c.id === characterId);
  return found ? found.emoji : CHARACTERS.find((c) => c.id === DEFAULT_CHARACTER).emoji;
}

function packIdForItem(itemId) {
  return AVATAR_PACKS.find((pack) => pack.itemIds.includes(itemId))?.id ?? null;
}

function packMedallions(items, ownedPackIds = DEFAULT_OWNED_PACK_IDS) {
  return items.map((item) => ({
    ...item,
    packId: packIdForItem(item.id),
    unlocked: ownedPackIds.includes(packIdForItem(item.id)),
  }));
}

export function hairstyleMedallionData(ownedPackIds = DEFAULT_OWNED_PACK_IDS) {
  return packMedallions(HAIRSTYLES, ownedPackIds);
}

export function outfitMedallionData(ownedPackIds = DEFAULT_OWNED_PACK_IDS) {
  return packMedallions(OUTFITS, ownedPackIds);
}

export function companionMedallionData(ownedPackIds = DEFAULT_OWNED_PACK_IDS) {
  return packMedallions(COMPANIONS, ownedPackIds);
}

export function companionAccessoryMedallionData(ownedPackIds = DEFAULT_OWNED_PACK_IDS) {
  return packMedallions(COMPANION_ACCESSORIES, ownedPackIds);
}

export function avatarPackData(avatarLevel, ownedPackIds = DEFAULT_OWNED_PACK_IDS) {
  return AVATAR_PACKS.map((pack) => ({
    ...pack,
    owned: ownedPackIds.includes(pack.id),
    levelUnlocked: avatarLevel >= pack.requiredLevel,
  }));
}

export function packIdsForSelectedItems(selectedItemIds = []) {
  return [...new Set(selectedItemIds.map(packIdForItem).filter(Boolean))];
}

export function purchaseAvatarPack(profile, packId) {
  const pack = AVATAR_PACKS.find((item) => item.id === packId);
  if (!pack) return { success: false, reason: 'unknown-pack' };
  const ownedPackIds = [...new Set([...DEFAULT_OWNED_PACK_IDS, ...(profile.ownedPackIds ?? [])])];
  if (ownedPackIds.includes(pack.id)) return { success: false, reason: 'already-owned' };
  if ((profile.avatarLevel ?? 1) < pack.requiredLevel) return { success: false, reason: 'level-locked' };
  if ((profile.coins ?? 0) < pack.cost) return { success: false, reason: 'insufficient-coins' };
  return {
    success: true,
    coins: (profile.coins ?? 0) - pack.cost,
    ownedPackIds: [...ownedPackIds, pack.id],
  };
}

export function visualForCharacter(characterId) {
  const fallback = CHARACTERS.find((c) => c.id === DEFAULT_CHARACTER);
  const found = CHARACTERS.find((c) => c.id === characterId) ?? fallback;
  return { id: found.id, name: found.name, skin: found.skin, hair: found.hair, outfit: found.outfit, accent: found.accent };
}

export function visualForHairstyle(hairstyleId) {
  return HAIRSTYLES.find((item) => item.id === hairstyleId)
    ?? HAIRSTYLES.find((item) => item.id === DEFAULT_HAIRSTYLE);
}

export function visualForOutfit(outfitId) {
  return OUTFITS.find((item) => item.id === outfitId)
    ?? OUTFITS.find((item) => item.id === DEFAULT_OUTFIT);
}

export function companionForId(companionId) {
  return COMPANIONS.find((item) => item.id === companionId)
    ?? COMPANIONS.find((item) => item.id === DEFAULT_COMPANION);
}

export function companionAccessoryForId(accessoryId) {
  return COMPANION_ACCESSORIES.find((item) => item.id === accessoryId)
    ?? COMPANION_ACCESSORIES.find((item) => item.id === DEFAULT_COMPANION_ACCESSORY);
}

export function emojiForHat(hatId) {
  if (!hatId) return null;
  const found = HATS.find((h) => h.id === hatId);
  return found ? found.emoji : null;
}

export function emojiForCape(capeId) {
  if (!capeId) return null;
  const found = CAPES.find((c) => c.id === capeId);
  return found ? found.emoji : null;
}

// Dégradé CSS prêt à poser en style inline (ex. sur .home-header), avec repli
// sur le décor par défaut si l'id est inconnu ou absent.
export function decorGradientCss(decorId) {
  const found = DECORS.find((d) => d.id === decorId) ?? DECORS.find((d) => d.id === DEFAULT_DECOR);
  return `linear-gradient(160deg, ${found.gradient.join(', ')})`;
}
