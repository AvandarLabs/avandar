import type { Input } from "./GeometryDetailBudget.schema";
/** Complete fictional default document. */
export const DEFAULT_INPUT: Input = {
  vertices: [
    [10, 50],
    [25, 53],
    [40, 49],
    [55, 72],
    [70, 50],
    [90, 52],
  ],
  tolerance: 6,
  labels: {
    original: "Original line",
    simplified: "Simplified line",
    kept: "Kept vertices",
    removed: "Removed vertices",
    unit: "grid units",
  },
  showDeviationGuides: true,
  copy: {
    context: "Fictional schematic geography",
    before: "Supplied observations",
    after: "Derived display",
  },
};
/** Complete alternate data and toggle behavior. */
export const CHANGED_INPUT: Input = {
  vertices: [
    [5, 5],
    [30, 50],
    [60, 50],
    [30, 50],
    [95, 95],
  ],
  tolerance: 30,
  labels: {
    original: "Original line",
    simplified: "Simplified line",
    kept: "Kept vertices",
    removed: "Removed vertices",
    unit: "grid units",
  },
  showDeviationGuides: false,
  copy: {
    context: "Fictional schematic geography",
    before: "Supplied observations",
    after: "Derived display",
  },
};
/** Default, minimum, dense and changed accepted documents. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      vertices: [
        [5, 5],
        [50, 50],
        [95, 95],
      ],
      tolerance: 0,
      labels: {
        original: "Original line",
        simplified: "Simplified line",
        kept: "Kept vertices",
        removed: "Removed vertices",
        unit: "grid units",
      },
      showDeviationGuides: true,
      copy: {
        context: "Fictional schematic geography",
        before: "Supplied observations",
        after: "Derived display",
      },
    },
  },
  {
    id: "dense",
    input: {
      vertices: [
        [5, 20],
        [18, 80],
        [30, 30],
        [42, 75],
        [54, 25],
        [66, 70],
        [80, 30],
        [95, 75],
      ],
      tolerance: 6,
      labels: {
        original: "MMMMMMMMMMMMMMMMMMMMMMMMMM",
        simplified: "MMMMMMMMMMMMMMMMMMMMMMMMMM",
        kept: "MMMMMMMMMMMMMMMMMMMMMMMMMM",
        removed: "MMMMMMMMMMMMMMMMMMMMMMMMMM",
        unit: "MMMMMMMMMMMMMMMMMMMMMMMMMM",
      },
      showDeviationGuides: true,
      copy: {
        context: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        before: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        after: "MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM",
      },
    },
  },
  { id: "changed", input: CHANGED_INPUT },
];
/** Structural, bound and semantic rejections. */
export const INVALID_INPUTS: unknown[] = [
  {},
  {
    vertices: [
      [10, 50],
      [25, 53],
      [40, 49],
      [55, 72],
      [70, 50],
      [90, 52],
    ],
    tolerance: 6,
    labels: {
      original: "Original line",
      simplified: "Simplified line",
      kept: "Kept vertices",
      removed: "Removed vertices",
      unit: "grid units",
    },
    showDeviationGuides: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
    extra: true,
  },
  {
    vertices: [
      [10, 50],
      [25, 53],
      [40, 49],
      [55, 72],
      [70, 50],
      [90, 52],
    ],
    tolerance: 6,
    labels: {
      original: "Original line",
      simplified: "Simplified line",
      kept: "Kept vertices",
      removed: "Removed vertices",
      unit: "grid units",
    },
    showDeviationGuides: true,
    copy: {
      context: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    vertices: [],
    tolerance: 6,
    labels: {
      original: "Original line",
      simplified: "Simplified line",
      kept: "Kept vertices",
      removed: "Removed vertices",
      unit: "grid units",
    },
    showDeviationGuides: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    vertices: [
      [10, 50],
      [25, 53],
      [40, 49],
      [55, 72],
      [70, 50],
      [90, 52],
      [10, 50],
      [25, 53],
      [40, 49],
      [55, 72],
      [70, 50],
      [90, 52],
    ],
    tolerance: 6,
    labels: {
      original: "Original line",
      simplified: "Simplified line",
      kept: "Kept vertices",
      removed: "Removed vertices",
      unit: "grid units",
    },
    showDeviationGuides: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    vertices: [
      [10, 50],
      [25, 53],
      [40, 49],
      [55, 72],
      [70, 50],
      [90, 52],
    ],
    tolerance: -1,
    labels: {
      original: "Original line",
      simplified: "Simplified line",
      kept: "Kept vertices",
      removed: "Removed vertices",
      unit: "grid units",
    },
    showDeviationGuides: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    vertices: [
      [5, 5],
      [5, 5],
      [95, 95],
    ],
    tolerance: 6,
    labels: {
      original: "Original line",
      simplified: "Simplified line",
      kept: "Kept vertices",
      removed: "Removed vertices",
      unit: "grid units",
    },
    showDeviationGuides: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    vertices: [
      [5, 5],
      [50, 50],
      [5, 5],
    ],
    tolerance: 6,
    labels: {
      original: "Original line",
      simplified: "Simplified line",
      kept: "Kept vertices",
      removed: "Removed vertices",
      unit: "grid units",
    },
    showDeviationGuides: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    vertices: [
      [4, 5],
      [50, 50],
      [95, 95],
    ],
    tolerance: 6,
    labels: {
      original: "Original line",
      simplified: "Simplified line",
      kept: "Kept vertices",
      removed: "Removed vertices",
      unit: "grid units",
    },
    showDeviationGuides: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
];
