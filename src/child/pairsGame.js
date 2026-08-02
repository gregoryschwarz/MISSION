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
  if (round.matchedCalcIds.has(calcTileId) || round.matchedResultIds.has(resultTileId)) {
    throw new Error('Cannot attempt a match on a tile that is already matched');
  }
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
