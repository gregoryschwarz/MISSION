const PLACE_LABELS = ['unités', 'dizaines', 'centaines', 'milliers'];

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function labelFor(index) {
  return PLACE_LABELS[index] ?? `colonne ${index + 1}`;
}

export function additionHint(a, b) {
  const digitsA = String(a).split('').reverse().map(Number);
  const digitsB = String(b).split('').reverse().map(Number);
  const length = Math.max(digitsA.length, digitsB.length);
  const steps = [];
  let carry = 0;
  for (let i = 0; i < length; i += 1) {
    const da = digitsA[i] ?? 0;
    const db = digitsB[i] ?? 0;
    const sum = da + db + carry;
    const digit = sum % 10;
    const nextCarry = sum >= 10 ? 1 : 0;
    let text = `${capitalize(labelFor(i))} : ${da} + ${db}`;
    if (carry > 0) text += ` + ${carry} (retenue)`;
    text += ` = ${sum}`;
    text += nextCarry ? ` → tu poses ${digit} et retiens 1.` : '.';
    steps.push(text);
    carry = nextCarry;
  }
  if (carry > 0) {
    steps.push(`${capitalize(labelFor(length))} : tu poses la retenue ${carry}.`);
  }
  steps.push(`Résultat : ${a} + ${b} = ${a + b}.`);
  return steps;
}

export function subtractionHint(a, b) {
  const digitsA = String(a).split('').reverse().map(Number);
  const digitsB = String(b).split('').reverse().map(Number);
  const steps = [];
  let borrow = 0;
  for (let i = 0; i < digitsA.length; i += 1) {
    const raw = digitsA[i] - borrow;
    const cascaded = raw < 0;
    const da = cascaded ? raw + 10 : raw;
    const db = digitsB[i] ?? 0;
    const prefix = cascaded
      ? `${capitalize(labelFor(i))} : la colonne précédente a emprunté, donc ici c'est ${da}. `
      : `${capitalize(labelFor(i))} : `;
    if (da < db) {
      steps.push(
        `${prefix}Tu ne peux pas faire ${da} - ${db}, tu empruntes 1 à la colonne suivante : ${da + 10} - ${db} = ${da + 10 - db}.`
      );
      borrow = 1;
    } else {
      steps.push(`${prefix}${da} - ${db} = ${da - db}.`);
      borrow = cascaded ? 1 : 0;
    }
  }
  steps.push(`Résultat : ${a} - ${b} = ${a - b}.`);
  return steps;
}

export function multiplicationHint(a, b) {
  const smaller = Math.min(a, b);
  const larger = Math.max(a, b);
  const steps = [];
  if (smaller <= 5) {
    const terms = Array(smaller).fill(larger).join(' + ');
    steps.push(`${a} × ${b}, c'est ${larger} répété ${smaller} fois : ${terms} = ${a * b}.`);
  } else if (smaller === larger) {
    steps.push(`${a} × ${b} : utilise ta table de multiplication de ${smaller}.`);
  } else {
    steps.push(`${a} × ${b} : utilise ta table de multiplication de ${smaller} (ou de ${larger}).`);
  }
  steps.push(`Résultat : ${a} × ${b} = ${a * b}.`);
  return steps;
}

export function divisionHint(a, b) {
  const quotient = a / b;
  const multiples = [];
  for (let i = 1; i <= quotient; i += 1) {
    multiples.push(i * b);
  }
  return [
    `${a} ÷ ${b} : combien de fois ${b} dans ${a} ? Compte les multiples de ${b} : ${multiples.join(', ')}.`,
    `Résultat : ${a} ÷ ${b} = ${quotient}.`,
  ];
}

export function dynamicHintSteps(question) {
  switch (question.type) {
    case 'addition':
      return additionHint(question.a, question.b);
    case 'soustraction':
      return subtractionHint(question.a, question.b);
    case 'multiplication':
      return multiplicationHint(question.a, question.b);
    case 'division':
      return divisionHint(question.a, question.b);
    case 'probleme':
      return question.operation === 'addition'
        ? additionHint(question.a, question.b)
        : subtractionHint(question.a, question.b);
    default:
      return null;
  }
}
