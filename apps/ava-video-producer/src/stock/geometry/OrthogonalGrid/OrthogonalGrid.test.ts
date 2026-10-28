import assert from "node:assert/strict";
import test from "node:test";
import { OrthogonalGrid, type OrthogonalGridCell } from "./OrthogonalGrid";

function _outline(cells: readonly OrthogonalGridCell[]): string {
  return OrthogonalGrid.getOutlineFromCells({
    cells,
    origin: { x: 0, y: 0 },
    cellWidth: 1,
    cellHeight: 1,
  });
}
test("side adjacency connects a bent chain independently of input order", () => {
  const cells = [
    { column: 2, row: 2 },
    { column: 1, row: 2 },
    { column: 1, row: 1 },
  ];
  assert.equal(OrthogonalGrid.areCellsConnected(cells), true);
  assert.equal(OrthogonalGrid.areCellsConnected([...cells].reverse()), true);
  assert.equal(
    OrthogonalGrid.areCellsConnected([{ column: -4, row: 8 }]),
    true,
  );
});
test("empty, diagonal and separated cells do not form a connected footprint", () => {
  assert.equal(OrthogonalGrid.areCellsConnected([]), false);
  assert.equal(
    OrthogonalGrid.areCellsConnected([
      { column: 0, row: 0 },
      { column: 1, row: 1 },
    ]),
    false,
  );
  assert.equal(
    OrthogonalGrid.areCellsConnected([
      { column: 0, row: 0 },
      { column: 1, row: 0 },
      { column: 3, row: 0 },
    ]),
    false,
  );
});
test("shared edges disappear once while six exterior edges remain unique", () => {
  const path = _outline([
    { column: 0, row: 0 },
    { column: 1, row: 0 },
  ]);
  const edges = path.split(" M");
  assert.equal(edges.length, 6);
  assert.equal(new Set(edges.map((edge) => edge.replace(/^M/, ""))).size, 6);
  assert.doesNotMatch(path, /M1 0v1/);
  assert.equal(path, "M0 0h1 M0 1h1 M0 0v1 M1 0h1 M2 0v1 M1 1h1");
});
test("a connected ring retains all four hole edges without inventing a center cell", () => {
  const cells = Array.from({ length: 9 }, (_, index) => ({
    column: index % 3,
    row: Math.floor(index / 3),
  })).filter((cell) => cell.column !== 1 || cell.row !== 1);
  const path = _outline(cells);
  assert.equal(OrthogonalGrid.areCellsConnected(cells), true);
  assert.equal(path.split(" M").length, 16);
  ["M1 1h1", "M1 1v1", "M2 1v1", "M1 2h1"].forEach((edge) =>
    assert.ok(path.includes(edge), edge),
  );
});
test("outline placement applies caller origin and unequal cell dimensions exactly", () => {
  assert.equal(
    OrthogonalGrid.getOutlineFromCells({
      cells: [{ column: 2, row: 1 }],
      origin: { x: 60, y: 145 },
      cellWidth: 82,
      cellHeight: 62,
    }),
    "M224 207h82 M306 207v62 M224 269h82 M224 207v62",
  );
  assert.equal(_outline([]), "");
});
