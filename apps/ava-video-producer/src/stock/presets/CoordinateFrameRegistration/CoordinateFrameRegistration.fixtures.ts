import type { Input } from "./CoordinateFrameRegistration.schema";
/** Complete fictional default document. */
export const DEFAULT_INPUT: Input = {
  landmarks: [
    { id: "a", label: "Landmark A", x: 10, y: 20 },
    { id: "b", label: "Landmark B", x: 35, y: 45 },
    { id: "c", label: "Landmark C", x: 20, y: 60 },
  ],
  transform: { scaleX: 1, scaleY: 0.75, offsetX: 20, offsetY: 5 },
  frames: {
    source: "Local grid A",
    target: "Local grid B",
    sourceUnit: "A units",
    targetUnit: "B units",
  },
  showCoordinatePairs: true,
  copy: {
    context: "Fictional schematic geography",
    before: "Supplied observations",
    after: "Derived display",
  },
};
/** Complete alternate data and toggle behavior. */
export const CHANGED_INPUT: Input = {
  landmarks: [
    { id: "", label: "Coincident A", x: 20, y: 30 },
    { id: "a b", label: "Coincident B", x: 20, y: 30 },
  ],
  transform: { scaleX: 2, scaleY: 0.5, offsetX: -10, offsetY: -5 },
  frames: {
    source: "Local grid A",
    target: "Local grid B",
    sourceUnit: "A units",
    targetUnit: "B units",
  },
  showCoordinatePairs: false,
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
      landmarks: [
        { id: "", label: "", x: 0, y: 0 },
        { id: "b", label: "B", x: 100, y: 100 },
      ],
      transform: { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 },
      frames: {
        source: "Local grid A",
        target: "Local grid B",
        sourceUnit: "A units",
        targetUnit: "B units",
      },
      showCoordinatePairs: true,
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
      landmarks: [
        { id: "0", label: "MMMMMMMMMMMMMMMMMMMM", x: 20, y: 30 },
        { id: "1", label: "MMMMMMMMMMMMMMMMMMMM", x: 30, y: 40 },
        { id: "2", label: "MMMMMMMMMMMMMMMMMMMM", x: 40, y: 50 },
        { id: "3", label: "MMMMMMMMMMMMMMMMMMMM", x: 50, y: 60 },
      ],
      transform: { scaleX: 1, scaleY: 0.75, offsetX: 20, offsetY: 5 },
      frames: {
        source: "MMMMMMMMMMMMMMMMMMMM",
        target: "WWWWWWWWWWWWWWWWWWWW",
        sourceUnit: "MMMMMMMMMMMMMMMMMMMM",
        targetUnit: "MMMMMMMMMMMMMMMMMMMM",
      },
      showCoordinatePairs: true,
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
    landmarks: [
      { id: "a", label: "Landmark A", x: 10, y: 20 },
      { id: "b", label: "Landmark B", x: 35, y: 45 },
      { id: "c", label: "Landmark C", x: 20, y: 60 },
    ],
    transform: { scaleX: 1, scaleY: 0.75, offsetX: 20, offsetY: 5 },
    frames: {
      source: "Local grid A",
      target: "Local grid B",
      sourceUnit: "A units",
      targetUnit: "B units",
    },
    showCoordinatePairs: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
    extra: true,
  },
  {
    landmarks: [
      { id: "a", label: "Landmark A", x: 10, y: 20 },
      { id: "b", label: "Landmark B", x: 35, y: 45 },
      { id: "c", label: "Landmark C", x: 20, y: 60 },
    ],
    transform: { scaleX: 1, scaleY: 0.75, offsetX: 20, offsetY: 5 },
    frames: {
      source: "Local grid A",
      target: "Local grid B",
      sourceUnit: "A units",
      targetUnit: "B units",
    },
    showCoordinatePairs: true,
    copy: {
      context: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    landmarks: [],
    transform: { scaleX: 1, scaleY: 0.75, offsetX: 20, offsetY: 5 },
    frames: {
      source: "Local grid A",
      target: "Local grid B",
      sourceUnit: "A units",
      targetUnit: "B units",
    },
    showCoordinatePairs: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    landmarks: [
      { id: "a", label: "Landmark A", x: 10, y: 20 },
      { id: "b", label: "Landmark B", x: 35, y: 45 },
      { id: "c", label: "Landmark C", x: 20, y: 60 },
      { id: "a", label: "Landmark A", x: 10, y: 20 },
      { id: "b", label: "Landmark B", x: 35, y: 45 },
      { id: "c", label: "Landmark C", x: 20, y: 60 },
    ],
    transform: { scaleX: 1, scaleY: 0.75, offsetX: 20, offsetY: 5 },
    frames: {
      source: "Local grid A",
      target: "Local grid B",
      sourceUnit: "A units",
      targetUnit: "B units",
    },
    showCoordinatePairs: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    landmarks: [
      { id: "a", label: "Landmark A", x: 10, y: 20 },
      { id: "b", label: "Landmark B", x: 35, y: 45 },
      { id: "c", label: "Landmark C", x: 20, y: 60 },
    ],
    transform: { scaleX: 1, scaleY: 0.75, offsetX: 20, offsetY: 5 },
    frames: {
      source: "Local grid A",
      target: "Local grid A",
      sourceUnit: "A units",
      targetUnit: "B units",
    },
    showCoordinatePairs: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    landmarks: [
      { id: "a", label: "Landmark A", x: 10, y: 20 },
      { id: "b", label: "Landmark B", x: 35, y: 45 },
      { id: "c", label: "Landmark C", x: 20, y: 60 },
    ],
    transform: { scaleX: 0, scaleY: 0.75, offsetX: 20, offsetY: 5 },
    frames: {
      source: "Local grid A",
      target: "Local grid B",
      sourceUnit: "A units",
      targetUnit: "B units",
    },
    showCoordinatePairs: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    landmarks: [
      { id: "a", label: "Landmark A", x: 10, y: 20 },
      { id: "b", label: "Landmark B", x: 35, y: 45 },
      { id: "c", label: "Landmark C", x: 20, y: 60 },
    ],
    transform: { scaleX: 2, scaleY: 0.75, offsetX: 50, offsetY: 5 },
    frames: {
      source: "Local grid A",
      target: "Local grid B",
      sourceUnit: "A units",
      targetUnit: "B units",
    },
    showCoordinatePairs: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    landmarks: [
      { id: "xxxxxxxxxxxxx", label: "Landmark A", x: 10, y: 20 },
      { id: "b", label: "Landmark B", x: 35, y: 45 },
      { id: "c", label: "Landmark C", x: 20, y: 60 },
    ],
    transform: { scaleX: 1, scaleY: 0.75, offsetX: 20, offsetY: 5 },
    frames: {
      source: "Local grid A",
      target: "Local grid B",
      sourceUnit: "A units",
      targetUnit: "B units",
    },
    showCoordinatePairs: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
];
