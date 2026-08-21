import { describe, it, expect } from 'vitest';
import { createPairsRound, attemptMatch, isPairsRoundComplete } from '../../src/child/pairsGame.js';

const sampleQuestions = [
  { type: 'addition', a: 2, b: 3, answer: 5, prompt: '2 + 3' },
  { type: 'soustraction', a: 9, b: 4, answer: 5, prompt: '9 - 4' },
  { type: 'multiplication', a: 2, b: 3, answer: 6, prompt: '2 x 3' },
];

describe('createPairsRound', () => {
  it('produces one calc tile and one result tile per question', () => {
    const round = createPairsRound(sampleQuestions);
    expect(round.calcTiles).toHaveLength(3);
    expect(round.resultTiles).toHaveLength(3);
    const calcAnswers = round.calcTiles.map((t) => t.answer).sort();
    const resultAnswers = round.resultTiles.map((t) => t.answer).sort();
    expect(calcAnswers).toEqual(resultAnswers);
  });

  it('gives each calc tile the prompt and type of its source question', () => {
    const round = createPairsRound(sampleQuestions);
    const additionTile = round.calcTiles.find((t) => t.prompt === '2 + 3');
    expect(additionTile.type).toBe('addition');
    expect(additionTile.answer).toBe(5);
  });

  it('carries the shape field on a geometrie calc tile', () => {
    const geometryQuestions = [
      { type: 'geometrie', shape: 'triangle', answer: 3, prompt: 'Combien de côtés a cette forme ?' },
      { type: 'geometrie', shape: 'carre', answer: 4, prompt: 'Combien de côtés a cette forme ?' },
    ];
    const round = createPairsRound(geometryQuestions);
    const triangleTile = round.calcTiles.find((t) => t.shape === 'triangle');
    expect(triangleTile).toBeDefined();
    expect(triangleTile.answer).toBe(3);
    const carreTile = round.calcTiles.find((t) => t.shape === 'carre');
    expect(carreTile).toBeDefined();
    expect(carreTile.answer).toBe(4);
  });

  it('leaves shape undefined for non-geometrie calc tiles', () => {
    const round = createPairsRound(sampleQuestions);
    round.calcTiles.forEach((t) => expect(t.shape).toBeUndefined());
  });

  it('carries the items field on a monnaie calc tile', () => {
    const moneyQuestions = [
      { type: 'monnaie', items: ['1e', '50c'], answer: 150, prompt: 'Combien y a-t-il en tout ?' },
    ];
    const round = createPairsRound(moneyQuestions);
    expect(round.calcTiles[0].items).toEqual(['1e', '50c']);
  });

  it('keeps fixed answer options for later mistake practice', () => {
    const questions = [
      { type: 'comparaison', a: 2, b: 8, answer: '<', prompt: '2 ___ 8', options: ['>', '<'] },
    ];
    const round = createPairsRound(questions);
    expect(round.calcTiles[0].options).toEqual(['>', '<']);
  });

  it('carries a and b on a longueur calc tile', () => {
    const lengthQuestions = [
      { type: 'longueur', a: 12, b: 8, answer: '>', prompt: '12 cm ___ 8 cm', options: ['>', '<'] },
    ];
    const round = createPairsRound(lengthQuestions);
    expect(round.calcTiles[0].a).toBe(12);
    expect(round.calcTiles[0].b).toBe(8);
  });

  it('carries hour12 and minute on a temps calc tile', () => {
    const timeQuestions = [
      { type: 'temps', hour12: 3, minute: 30, hour24: 3, answer: '3h30', prompt: 'Quelle heure est-il ?', options: ['3h30', '4h00', '2h30'] },
    ];
    const round = createPairsRound(timeQuestions);
    expect(round.calcTiles[0].hour12).toBe(3);
    expect(round.calcTiles[0].minute).toBe(30);
  });

  it('starts with no matched tiles', () => {
    const round = createPairsRound(sampleQuestions);
    expect(round.matchedCalcIds.size).toBe(0);
    expect(round.matchedResultIds.size).toBe(0);
  });

  it('gives each calc tile and its true result tile a matching pairKey', () => {
    const round = createPairsRound(sampleQuestions);
    round.calcTiles.forEach((calcTile) => {
      const trueResult = round.resultTiles.find((t) => t.pairKey === calcTile.pairKey);
      expect(trueResult).toBeDefined();
      expect(trueResult.answer).toBe(calcTile.answer);
    });
  });
});

describe('attemptMatch', () => {
  it('marks a correct pairing as matched and reports firstAttempt true', () => {
    const round = createPairsRound(sampleQuestions);
    const calcTile = round.calcTiles.find((t) => t.prompt === '2 x 3');
    const resultTile = round.resultTiles.find((t) => t.answer === 6);
    const result = attemptMatch(round, calcTile.id, resultTile.id);
    expect(result).toEqual({ isCorrect: true, firstAttempt: true });
    expect(round.matchedCalcIds.has(calcTile.id)).toBe(true);
    expect(round.matchedResultIds.has(resultTile.id)).toBe(true);
  });

  it('reports an incorrect pairing without marking anything matched', () => {
    const round = createPairsRound(sampleQuestions);
    const calcTile = round.calcTiles.find((t) => t.prompt === '2 x 3');
    const wrongResultTile = round.resultTiles.find((t) => t.answer !== 6);
    const result = attemptMatch(round, calcTile.id, wrongResultTile.id);
    expect(result.isCorrect).toBe(false);
    expect(round.matchedCalcIds.size).toBe(0);
  });

  it('reports firstAttempt only on the very first try for a given calc tile', () => {
    const round = createPairsRound(sampleQuestions);
    const calcTile = round.calcTiles.find((t) => t.prompt === '2 x 3');
    const wrongResultTile = round.resultTiles.find((t) => t.answer !== 6);
    const correctResultTile = round.resultTiles.find((t) => t.answer === 6);

    const first = attemptMatch(round, calcTile.id, wrongResultTile.id);
    expect(first.firstAttempt).toBe(true);

    const second = attemptMatch(round, calcTile.id, correctResultTile.id);
    expect(second.firstAttempt).toBe(false);
    expect(second.isCorrect).toBe(true);
  });

  it('throws when attempting to match a calc tile that is already matched', () => {
    const round = createPairsRound(sampleQuestions);
    const calcTile = round.calcTiles.find((t) => t.prompt === '2 x 3');
    const resultTile = round.resultTiles.find((t) => t.answer === 6);
    attemptMatch(round, calcTile.id, resultTile.id);
    const anotherResultTile = round.resultTiles.find((t) => t.id !== resultTile.id);
    expect(() => attemptMatch(round, calcTile.id, anotherResultTile.id)).toThrow();
  });

  it('throws when attempting to match a result tile that is already matched', () => {
    const round = createPairsRound(sampleQuestions);
    const calcTile = round.calcTiles.find((t) => t.prompt === '2 x 3');
    const resultTile = round.resultTiles.find((t) => t.answer === 6);
    attemptMatch(round, calcTile.id, resultTile.id);
    const anotherCalcTile = round.calcTiles.find((t) => t.id !== calcTile.id);
    expect(() => attemptMatch(round, anotherCalcTile.id, resultTile.id)).toThrow();
  });

  it('correctly matches two calc tiles that share the same answer to two distinct result tiles', () => {
    const duplicateAnswerQuestions = [
      { type: 'addition', a: 2, b: 3, answer: 5, prompt: '2 + 3' },
      { type: 'soustraction', a: 9, b: 4, answer: 5, prompt: '9 - 4' },
    ];
    const round = createPairsRound(duplicateAnswerQuestions);
    const [calcA, calcB] = round.calcTiles;
    const [resultX, resultY] = round.resultTiles;

    const first = attemptMatch(round, calcA.id, resultX.id);
    expect(first.isCorrect).toBe(true);

    const second = attemptMatch(round, calcB.id, resultY.id);
    expect(second.isCorrect).toBe(true);

    expect(round.matchedCalcIds.size).toBe(2);
    expect(round.matchedResultIds.size).toBe(2);
    expect(isPairsRoundComplete(round)).toBe(true);
  });
});

describe('attemptMatch with symbolic-answer types (comparaison/fraction)', () => {
  it('matches a comparaison calc tile only to its own result tile, even when another question shares the same symbol', () => {
    const symbolicQuestions = [
      { type: 'comparaison', a: 8, b: 3, answer: '>', prompt: '8 ___ 3' },
      { type: 'comparaison', a: 9, b: 2, answer: '>', prompt: '9 ___ 2' },
    ];
    const round = createPairsRound(symbolicQuestions);
    const calcA = round.calcTiles.find((t) => t.prompt === '8 ___ 3');
    const trueResultA = round.resultTiles.find((t) => t.pairKey === calcA.pairKey);
    const wrongResult = round.resultTiles.find((t) => t.pairKey !== calcA.pairKey);

    const wrongAttempt = attemptMatch(round, calcA.id, wrongResult.id);
    expect(wrongAttempt.isCorrect).toBe(false);

    const rightAttempt = attemptMatch(round, calcA.id, trueResultA.id);
    expect(rightAttempt.isCorrect).toBe(true);
  });

  it('applies the same origin-based matching rule to fraction questions, including across types', () => {
    const mixedQuestions = [
      { type: 'fraction', a: { numerator: 1, denominator: 4 }, b: { numerator: 3, denominator: 4 }, answer: '<', prompt: '1/4 ___ 3/4' },
      { type: 'fraction', a: { numerator: 2, denominator: 3 }, b: { numerator: 1, denominator: 3 }, answer: '>', prompt: '2/3 ___ 1/3' },
      { type: 'comparaison', a: 5, b: 1, answer: '>', prompt: '5 ___ 1' },
    ];
    const round = createPairsRound(mixedQuestions);
    const fractionCalc = round.calcTiles.find((t) => t.prompt === '2/3 ___ 1/3');
    const comparaisonResult = round.resultTiles.find((t) => t.pairKey !== fractionCalc.pairKey && t.answer === '>');
    const trueResult = round.resultTiles.find((t) => t.pairKey === fractionCalc.pairKey);

    const crossTypeAttempt = attemptMatch(round, fractionCalc.id, comparaisonResult.id);
    expect(crossTypeAttempt.isCorrect).toBe(false);

    const correctAttempt = attemptMatch(round, fractionCalc.id, trueResult.id);
    expect(correctAttempt.isCorrect).toBe(true);
  });
});

describe('attemptMatch with symbolic-answer types (longueur/temps)', () => {
  it('matches a longueur calc tile only to its own result tile, even when another question shares the same symbol', () => {
    const symbolicQuestions = [
      { type: 'longueur', a: 12, b: 8, answer: '>', prompt: '12 cm ___ 8 cm', options: ['>', '<'] },
      { type: 'longueur', a: 15, b: 3, answer: '>', prompt: '15 cm ___ 3 cm', options: ['>', '<'] },
    ];
    const round = createPairsRound(symbolicQuestions);
    const calcA = round.calcTiles.find((t) => t.prompt === '12 cm ___ 8 cm');
    const trueResultA = round.resultTiles.find((t) => t.pairKey === calcA.pairKey);
    const wrongResult = round.resultTiles.find((t) => t.pairKey !== calcA.pairKey);

    expect(attemptMatch(round, calcA.id, wrongResult.id).isCorrect).toBe(false);
    expect(attemptMatch(round, calcA.id, trueResultA.id).isCorrect).toBe(true);
  });

  it('matches a temps calc tile only to its own result tile, even when another question shares the same formatted answer', () => {
    const symbolicQuestions = [
      { type: 'temps', hour12: 3, minute: 0, hour24: 3, answer: '3h00', prompt: 'Quelle heure est-il ?', options: ['3h00', '3h30', '4h00'] },
      { type: 'temps', hour12: 3, minute: 0, hour24: 15, answer: '3h00', prompt: 'Quelle heure est-il ?', options: ['3h00', '3h30', '4h00'] },
    ];
    const round = createPairsRound(symbolicQuestions);
    const [calcA] = round.calcTiles;
    const trueResultA = round.resultTiles.find((t) => t.pairKey === calcA.pairKey);
    const wrongResult = round.resultTiles.find((t) => t.pairKey !== calcA.pairKey);

    expect(attemptMatch(round, calcA.id, wrongResult.id).isCorrect).toBe(false);
    expect(attemptMatch(round, calcA.id, trueResultA.id).isCorrect).toBe(true);
  });
});

describe('isPairsRoundComplete', () => {
  it('is false until every calc tile is matched', () => {
    const round = createPairsRound(sampleQuestions);
    expect(isPairsRoundComplete(round)).toBe(false);
  });

  it('is true once every calc tile has been correctly matched', () => {
    const round = createPairsRound(sampleQuestions);
    round.calcTiles.forEach((calcTile) => {
      const resultTile = round.resultTiles.find(
        (t) => t.answer === calcTile.answer && !round.matchedResultIds.has(t.id)
      );
      attemptMatch(round, calcTile.id, resultTile.id);
    });
    expect(isPairsRoundComplete(round)).toBe(true);
  });
});
