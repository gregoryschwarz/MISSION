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

  it('starts with no matched tiles', () => {
    const round = createPairsRound(sampleQuestions);
    expect(round.matchedCalcIds.size).toBe(0);
    expect(round.matchedResultIds.size).toBe(0);
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
