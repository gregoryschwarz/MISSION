import { shuffle } from './random.js';

export function createPairsRound(questions) {
  const calcTiles = shuffle(
    questions.map((q, i) => ({ id: `calc-${i}`, type: q.type, prompt: q.prompt, answer: q.answer }))
  );
  const resultTiles = shuffle(
    questions.map((q, i) => ({ id: `result-${i}`, answer: q.answer }))
  );
  return {
    calcTiles,
    resultTiles,
    matchedCalcIds: new Set(),
    matchedResultIds: new Set(),
    attemptedCalcIds: new Set(),
  };
}

export function attemptMatch(round, calcTileId, resultTileId) {
  const calcTile = round.calcTiles.find((t) => t.id === calcTileId);
  const resultTile = round.resultTiles.find((t) => t.id === resultTileId);
  const isCorrect = calcTile.answer === resultTile.answer;
  const firstAttempt = !round.attemptedCalcIds.has(calcTileId);
  round.attemptedCalcIds.add(calcTileId);
  if (isCorrect) {
    round.matchedCalcIds.add(calcTileId);
    round.matchedResultIds.add(resultTileId);
  }
  return { isCorrect, firstAttempt };
}

export function isPairsRoundComplete(round) {
  return round.matchedCalcIds.size === round.calcTiles.length;
}
