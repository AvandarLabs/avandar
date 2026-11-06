type Params = {
  time: number;
  firstCost: number;
  secondCost: number;
  minutes: number;
};
/**
 * Union of undirected reached intervals measured from the authored first end.
 */
export function getReachedIntervalsFromRoad({
  time,
  firstCost,
  secondCost,
  minutes,
}: Readonly<Params>): Array<[number, number]> {
  const firstProgress = Math.min(1, Math.max(0, (time - firstCost) / minutes));
  const secondProgress = Math.min(
    1,
    Math.max(0, (time - secondCost) / minutes),
  );
  if (firstProgress + secondProgress >= 1) {
    return [[0, 1]];
  }
  return secondProgress > 0
    ? [
        [0, firstProgress],
        [1 - secondProgress, 1],
      ]
    : [[0, firstProgress]];
}
