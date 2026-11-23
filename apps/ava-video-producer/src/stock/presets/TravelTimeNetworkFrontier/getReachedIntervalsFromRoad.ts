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
  return firstProgress + secondProgress >= 1
    ? [[0, 1]]
    : secondProgress > 0
      ? [
          [0, firstProgress],
          [1 - secondProgress, 1],
        ]
      : [[0, firstProgress]];
}
