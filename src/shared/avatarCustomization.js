// Personnalisation de l'avatar enfant : personnages, chapeaux, capes et décors
// de fond. Voir docs/cahier-des-charges.md ("Avatar personnalisable : 9
// personnages + accessoires (chapeaux 🎩 & capes ✨) + 8 décors colorés en fond").

// `cost` = deuxième voie de déblocage : un personnage encore hors de portée
// niveau peut être acheté directement avec des pièces (comme sur les
// maquettes de référence, ex. médaillon verrouillé "🔒 80").
export const CHARACTERS = [
  { id: 'unicorn', name: 'Étoile la licorne', emoji: '🦄', requiredLevel: 1, cost: 0 },
  { id: 'butterfly', name: 'Ailée le papillon', emoji: '🦋', requiredLevel: 2, cost: 20 },
  { id: 'cat', name: 'Minou le chat', emoji: '🐱', requiredLevel: 3, cost: 30 },
  { id: 'dog', name: 'Rex le chien', emoji: '🐶', requiredLevel: 4, cost: 40 },
  { id: 'fox', name: 'Filou le renard', emoji: '🦊', requiredLevel: 5, cost: 50 },
  { id: 'panda', name: 'Bao le panda', emoji: '🐼', requiredLevel: 6, cost: 60 },
  { id: 'lion', name: 'Léo le lion', emoji: '🦁', requiredLevel: 7, cost: 70 },
  { id: 'koala', name: 'Coali le koala', emoji: '🐨', requiredLevel: 8, cost: 80 },
  { id: 'dragon', name: 'Braise le dragon', emoji: '🐉', requiredLevel: 9, cost: 100 },
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
];

export const CAPES = [
  { id: 'none-cape', name: 'Aucune cape', emoji: null, requiresAnyOf: [] },
  { id: 'star-cape', name: 'Cape étoilée', emoji: '⭐', requiresAnyOf: ['streak-7'] },
  { id: 'rainbow-cape', name: 'Cape arc-en-ciel', emoji: '🌈', requiresAnyOf: ['perfect-10'] },
  { id: 'diamond-cape', name: 'Cape de diamant', emoji: '💎', requiresAnyOf: ['perfect-50'] },
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

// Un accessoire sans condition (requiresAnyOf vide, ex. "aucun") est toujours
// débloqué ; sinon il faut au moins un des badges listés.
function isUnlockedByBadge(item, badges) {
  if (item.requiresAnyOf.length === 0) return true;
  return item.requiresAnyOf.some((id) => badges.includes(id));
}

// Un personnage est débloqué soit par niveau, soit parce qu'il a été acheté
// avec des pièces (ownedCharacterIds) — les deux voies coexistent.
export function unlockedCharacters(avatarLevel, ownedCharacterIds = []) {
  return CHARACTERS.filter((c) => avatarLevel >= c.requiredLevel || ownedCharacterIds.includes(c.id));
}

export function unlockedHats(badges) {
  return HATS.filter((h) => isUnlockedByBadge(h, badges));
}

export function unlockedCapes(badges) {
  return CAPES.filter((c) => isUnlockedByBadge(c, badges));
}

export function unlockedDecors(avatarLevel) {
  return DECORS.filter((d) => avatarLevel >= d.requiredLevel);
}

export function characterMedallionData(avatarLevel, ownedCharacterIds = []) {
  const unlockedIds = unlockedCharacters(avatarLevel, ownedCharacterIds).map((c) => c.id);
  return CHARACTERS.map((c) => ({ ...c, unlocked: unlockedIds.includes(c.id) }));
}

export function hatMedallionData(badges) {
  const unlockedIds = unlockedHats(badges).map((h) => h.id);
  return HATS.map((h) => ({ ...h, unlocked: unlockedIds.includes(h.id) }));
}

export function capeMedallionData(badges) {
  const unlockedIds = unlockedCapes(badges).map((c) => c.id);
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
