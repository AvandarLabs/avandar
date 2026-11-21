type Point = readonly [number, number];
type OrientedEdges = {
  first: Point;
  second: Point;
  third: Point;
  fourth: Point;
  firstWinding: number;
  secondWinding: number;
};
/** Whether overlapping collinear edges put their polygon interiors together. */
export function doCollinearEdgesShareInterior({
  first,
  second,
  third,
  fourth,
  firstWinding,
  secondWinding,
}: Readonly<OrientedEdges>): boolean {
  const axis = first[0] === second[0] ? 1 : 0;
  const overlaps =
    Math.max(
      Math.min(first[axis], second[axis]),
      Math.min(third[axis], fourth[axis]),
    ) <
    Math.min(
      Math.max(first[axis], second[axis]),
      Math.max(third[axis], fourth[axis]),
    );
  const sameDirection =
    second[axis] > first[axis] === fourth[axis] > third[axis];
  return (
    overlaps &&
    (sameDirection
      ? firstWinding === secondWinding
      : firstWinding !== secondWinding)
  );
}
