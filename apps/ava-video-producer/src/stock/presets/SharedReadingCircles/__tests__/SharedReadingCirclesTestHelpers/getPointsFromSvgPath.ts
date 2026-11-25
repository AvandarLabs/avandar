/** Reads points from the line, horizontal, and vertical SVG path commands. */
export function getPointsFromSvgPath(path: string): number[][] {
  let x = 0;
  let y = 0;
  return [...path.matchAll(/([MLHV])([^MLHV]+)/g)].map(
    ([, command, values]) => {
      const coordinates = values.trim().split(/[ ,]+/).map(Number);
      if (command === "H") {
        x = coordinates[0];
      } else if (command === "V") {
        y = coordinates[0];
      } else {
        [x, y] = coordinates;
      }
      return [x, y];
    },
  );
}
