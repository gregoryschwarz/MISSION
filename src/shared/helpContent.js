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
};

export function helpTextForType(type) {
  return HELP_TEXT[type] ?? "Pas d'aide disponible pour cette notion.";
}
