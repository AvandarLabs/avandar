import assert from "node:assert/strict";
import test from "node:test";
import { PlanarPolygon } from "./PlanarPolygon";

const SQUARE: Array<[number, number]> = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
];
test("classifies edges and vertices separately from interior and exterior", () => {
  [
    [5, 5, "inside"],
    [11, 5, "outside"],
    [0, 5, "boundary"],
    [0, 0, "boundary"],
    [Number.MIN_VALUE, 5, "inside"],
  ].forEach(([x, y, expected]) => {
    assert.equal(
      PlanarPolygon.getPointClassification({
        point: [Number(x), Number(y)],
        polygon: SQUARE,
      }),
      expected,
    );
  });
});
test("accepts concavity, reversed winding, collinear intermediate vertices and thin rings", () => {
  const accepted: Array<Array<[number, number]>> = [
    SQUARE,
    [...SQUARE].reverse(),
    [
      [0, 0],
      [5, 0],
      [10, 0],
      [10, 10],
      [5, 5],
      [0, 10],
    ],
    [
      [0, 0],
      [1, 0],
      [1, Number.MIN_VALUE],
      [0, Number.MIN_VALUE],
    ],
    [
      [99, 99],
      [100, 99],
      [100, 99.00000000000001],
      [99, 99.00000000000001],
    ],
  ];
  accepted.forEach((polygon) =>
    assert.equal(PlanarPolygon.isSimple({ polygon }), true),
  );
  const concave: Array<[number, number]> = [
    [0, 0],
    [10, 0],
    [10, 10],
    [5, 5],
    [0, 10],
  ];
  [concave, [...concave].reverse()].forEach((polygon) => {
    assert.equal(
      PlanarPolygon.getPointClassification({ point: [5, 8], polygon }),
      "outside",
    );
    assert.equal(
      PlanarPolygon.getPointClassification({ point: [5, 2], polygon }),
      "inside",
    );
  });
});
test("rejects repeated vertices, backtracking, nonadjacent contact and crossings", () => {
  const rejected: Array<Array<[number, number]>> = [
    [],
    [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
    [
      [0, 0],
      [10, 10],
      [0, 10],
      [10, 0],
    ],
    [
      [0, 0],
      [10, 0],
      [5, 0],
      [10, 10],
      [0, 10],
    ],
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ],
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [5, 0],
      [0, 10],
    ],
    [
      [0, 0],
      [Infinity, 0],
      [0, 10],
    ],
  ];
  rejected.forEach((polygon) =>
    assert.equal(PlanarPolygon.isSimple({ polygon }), false),
  );
});

test("interior overlap includes containment, identical and crossing rings", () => {
  const samples: Array<Array<[number, number]>> = [
    SQUARE,
    [...SQUARE].reverse(),
    [
      [2, 2],
      [8, 2],
      [8, 8],
      [2, 8],
    ],
    [
      [-1, 4],
      [11, 4],
      [11, 6],
      [-1, 6],
    ],
    [
      [0, 5],
      [5, 0],
      [10, 5],
      [5, 10],
    ],
    [
      [0, 0],
      [5, 0],
      [5, 10],
      [0, 10],
    ],
  ];
  samples.forEach((secondPolygon) =>
    assert.equal(
      PlanarPolygon.doInteriorsOverlap({ firstPolygon: SQUARE, secondPolygon }),
      true,
    ),
  );
});
test("shared borders, vertices and concave voids have no interior overlap", () => {
  const samples: Array<Array<[number, number]>> = [
    [
      [10, 0],
      [20, 0],
      [20, 10],
      [10, 10],
    ],
    [
      [10, 10],
      [20, 10],
      [20, 20],
      [10, 20],
    ],
    [
      [11, 0],
      [20, 0],
      [20, 10],
      [11, 10],
    ],
  ];
  samples.forEach((secondPolygon) =>
    assert.equal(
      PlanarPolygon.doInteriorsOverlap({ firstPolygon: SQUARE, secondPolygon }),
      false,
    ),
  );
  const firstPolygon: Array<[number, number]> = [
    [0, 0],
    [10, 0],
    [10, 3],
    [3, 3],
    [3, 10],
    [0, 10],
  ];
  assert.equal(
    PlanarPolygon.doInteriorsOverlap({
      firstPolygon,
      secondPolygon: [
        [4, 4],
        [9, 4],
        [9, 9],
        [4, 9],
      ],
    }),
    false,
  );
  assert.equal(
    PlanarPolygon.doInteriorsOverlap({
      firstPolygon,
      secondPolygon: [
        [2, 2],
        [9, 2],
        [9, 9],
        [2, 9],
      ],
    }),
    true,
  );
});
test("exact overlap preserves subnormal interiors and collinear subdivisions", () => {
  const thin: Array<[number, number]> = [
    [0, 0],
    [1, 0],
    [1, Number.MIN_VALUE],
    [0, Number.MIN_VALUE],
  ];
  assert.equal(
    PlanarPolygon.doInteriorsOverlap({
      firstPolygon: thin,
      secondPolygon: [...thin].reverse(),
    }),
    true,
  );
  assert.equal(
    PlanarPolygon.doInteriorsOverlap({
      firstPolygon: SQUARE,
      secondPolygon: [
        [0, 0],
        [5, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ],
    }),
    true,
  );
});
test("interior overlap is symmetric under order and winding at a shared diagonal", () => {
  const lower: Array<[number, number]> = [
    [0, 0],
    [10, 0],
    [10, 10],
  ];
  const upper: Array<[number, number]> = [
    [0, 0],
    [10, 10],
    [0, 10],
  ];
  [lower, [...lower].reverse()].forEach((firstPolygon) =>
    [upper, [...upper].reverse()].forEach((secondPolygon) => {
      assert.equal(
        PlanarPolygon.doInteriorsOverlap({ firstPolygon, secondPolygon }),
        false,
      );
      assert.equal(
        PlanarPolygon.doInteriorsOverlap({
          firstPolygon: secondPolygon,
          secondPolygon: firstPolygon,
        }),
        false,
      );
    }),
  );
  const cut: Array<[number, number]> = [
    [0, 0],
    [10, 0],
    [10, 5],
    [5, 5],
    [5, 10],
    [0, 10],
  ];
  assert.equal(
    PlanarPolygon.doInteriorsOverlap({
      firstPolygon: cut,
      secondPolygon: [
        [2, 0],
        [8, 0],
        [8, 4],
        [2, 4],
      ],
    }),
    true,
  );
});

test("closed disks require strict containment and retain every boundary contact", () => {
  const polygon: Array<[number, number]> = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ];
  const cases: Array<{
    center: [number, number];
    radius: number;
    expected: string;
  }> = [
    { center: [5, 5], radius: 4, expected: "inside" },
    { center: [5, 5], radius: 5, expected: "intersecting" },
    { center: [5, 5], radius: 4.999999999999999, expected: "inside" },
    { center: [15, 5], radius: 5, expected: "intersecting" },
    { center: [15, 5], radius: 4.999999999999999, expected: "outside" },
    { center: [5, 5], radius: 20, expected: "intersecting" },
    { center: [0, 5], radius: 0, expected: "intersecting" },
    { center: [5, 5], radius: 0, expected: "inside" },
  ];
  cases.forEach(({ center, radius, expected }) =>
    [polygon, [...polygon].reverse()].forEach((ring) =>
      assert.equal(
        PlanarPolygon.getDiskClassification({ center, radius, polygon: ring }),
        expected,
      ),
    ),
  );
});
test("concave corners and subnormal disks use exact squared edge distance", () => {
  const concave: Array<[number, number]> = [
    [0, 0],
    [10, 0],
    [10, 10],
    [6, 10],
    [6, 4],
    [4, 4],
    [4, 10],
    [0, 10],
  ];
  assert.equal(
    PlanarPolygon.getDiskClassification({
      center: [5, 2],
      radius: 2,
      polygon: concave,
    }),
    "intersecting",
  );
  assert.equal(
    PlanarPolygon.getDiskClassification({
      center: [5, 2],
      radius: 1,
      polygon: concave,
    }),
    "inside",
  );
  const unit = Number.MIN_VALUE;
  const thin: Array<[number, number]> = [
    [0, 0],
    [unit * 8, 0],
    [unit * 8, unit * 8],
    [0, unit * 8],
  ];
  assert.equal(
    PlanarPolygon.getDiskClassification({
      center: [unit * 4, unit * 4],
      radius: unit * 3,
      polygon: thin,
    }),
    "inside",
  );
  assert.equal(
    PlanarPolygon.getDiskClassification({
      center: [unit * 4, unit * 4],
      radius: unit * 4,
      polygon: thin,
    }),
    "intersecting",
  );
  [NaN, Infinity, -1].forEach((radius) =>
    assert.throws(() =>
      PlanarPolygon.getDiskClassification({
        center: [1, 1],
        radius,
        polygon: concave,
      }),
    ),
  );
});
