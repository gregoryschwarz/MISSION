export const HELP_TEXT = {
  addition:
    "Additionner, c'est ajouter deux nombres ensemble. Commence par les unités (les chiffres de droite). Si le total dépasse 9, retiens 1 dizaine et ajoute-la à la colonne suivante.",
  soustraction:
    "Soustraire, c'est enlever un nombre à un autre. Commence par les unités. Si tu ne peux pas soustraire (le chiffre du haut est plus petit), emprunte 1 dizaine au nombre suivant.",
  multiplication:
    "Multiplier, c'est additionner plusieurs fois le même nombre. Par exemple, 4 × 3 veut dire 4 + 4 + 4. Tu peux aussi utiliser tes tables de multiplication !",
  comparaison:
    "Pour comparer deux nombres, regarde d'abord combien de chiffres ils ont : le nombre avec le plus de chiffres est le plus grand. S'ils ont autant de chiffres, compare-les de gauche à droite, chiffre par chiffre.",
  division:
    "Diviser, c'est partager un nombre en parts égales. Par exemple, 12 ÷ 3 veut dire : combien de fois 3 rentre dans 12 ? Tu peux t'aider de tes tables de multiplication à l'envers !",
  fraction:
    "Pour comparer deux fractions, regarde le numérateur (le chiffre du haut) : si les dénominateurs (le chiffre du bas) sont pareils, la fraction avec le plus grand numérateur est la plus grande.",
  geometrie:
    "Pour compter les côtés d'une forme, regarde combien de segments droits (lignes) forment son contour. Le cercle n'a aucun côté droit : c'est une ligne courbe, donc 0 côté.",
  monnaie:
    "Pour trouver le total, additionne la valeur de chaque pièce ou billet. Astuce : commence par les plus gros billets, puis ajoute les pièces une par une.",
  longueur:
    "Pour comparer deux longueurs, regarde simplement quel nombre de centimètres est le plus grand : ce segment-là est le plus long.",
  temps:
    "La petite aiguille indique l'heure, la grande indique les minutes. Grande aiguille sur le 12 : c'est une heure pile (ex : 3h00). Sur le 6 : une demi-heure (ex : 3h30). L'après-midi, ajoute 12 à l'heure du cadran (3h → 15h).",
  probleme:
    "Pour résoudre un problème, repère d'abord les nombres et ce qu'on te demande : est-ce qu'on ajoute (le total augmente) ou est-ce qu'on retire (il en reste moins) ? Une fois l'opération choisie, calcule comme d'habitude.",
};

export function helpTextForType(type) {
  return HELP_TEXT[type] ?? "Pas d'aide disponible pour cette notion.";
}
