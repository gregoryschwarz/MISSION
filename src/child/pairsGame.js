import { shuffle } from './random.js';

const SYMBOLIC_ANSWER_TYPES = ['comparaison', 'fraction', 'longueur', 'temps'];

export function createPairsRound(questions) {
  const calcTiles = shuffle(
    questions.map((q, i) => ({
      id: `calc-${i}`,
      pairKey: i,
      type: q.type,
      prompt: q.prompt,
      shape: q.shape,
      items: q.items,
      a: q.a,
      b: q.b,
      hour12: q.hour12,
      minute: q.minute,
      answer: q.answer,
    }))
  );
  const resultTiles = shuffle(
    questions.map((q, i) => ({ id: `result-${i}`, pairKey: i, answer: q.answer }))
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
  const isCorrect = SYMBOLIC_ANSWER_TYPES.includes(calcTile.type)
    ? calcTile.pairKey === resultTile.pairKey
    : calcTile.answer === resultTile.answer;
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
