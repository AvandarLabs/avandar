import type { Input } from "./CoordinateQualityTriage.schema";
/** Complete fictional default document. */
export const DEFAULT_INPUT: Input = {
  rows: [
    { id: "a", latitude: 20, longitude: 40 },
    { id: "b", latitude: null, longitude: 10 },
    { id: "c", latitude: 120, longitude: 30 },
    { id: "d", latitude: "north", longitude: 40 },
  ],
  labels: {
    plotted: "Plotted",
    missing: "Missing coordinate",
    nonNumeric: "Not numeric",
    range: "Out of range",
    total: "All supplied rows",
  },
  showValues: true,
  copy: {
    context: "Fictional schematic geography",
    before: "Supplied observations",
    after: "Derived display",
  },
};
/** Complete alternate data and toggle behavior. */
export const CHANGED_INPUT: Input = {
  rows: [
    { id: "a b", latitude: null, longitude: "north" },
    { id: "界", latitude: null, longitude: 360 },
    { id: "", latitude: 0, longitude: 0 },
  ],
  labels: {
    plotted: "Plotted",
    missing: "Missing coordinate",
    nonNumeric: "Not numeric",
    range: "Out of range",
    total: "All supplied rows",
  },
  showValues: false,
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
      rows: [
        { id: "", latitude: 0, longitude: 0 },
        { id: "b", latitude: -90, longitude: -180 },
      ],
      labels: {
        plotted: "Plotted",
        missing: "Missing coordinate",
        nonNumeric: "Not numeric",
        range: "Out of range",
        total: "All supplied rows",
      },
      showValues: true,
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
      rows: [
        { id: "0", latitude: 90, longitude: 180 },
        { id: "1", latitude: -90, longitude: -180 },
        { id: "2", latitude: null, longitude: "999" },
        { id: "3", latitude: "10", longitude: 200 },
        { id: "4", latitude: "", longitude: 0 },
        { id: "5", latitude: 360, longitude: 360 },
      ],
      labels: {
        plotted: "MMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        missing: "MMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        nonNumeric: "MMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        range: "MMMMMMMMMMMMMMMMMMMMMMMMMMMM",
        total: "MMMMMMMMMMMMMMMMMMMMMMMMMMMM",
      },
      showValues: true,
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
    rows: [
      { id: "a", latitude: 20, longitude: 40 },
      { id: "b", latitude: null, longitude: 10 },
      { id: "c", latitude: 120, longitude: 30 },
      { id: "d", latitude: "north", longitude: 40 },
    ],
    labels: {
      plotted: "Plotted",
      missing: "Missing coordinate",
      nonNumeric: "Not numeric",
      range: "Out of range",
      total: "All supplied rows",
    },
    showValues: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
    extra: true,
  },
  {
    rows: [
      { id: "a", latitude: 20, longitude: 40 },
      { id: "b", latitude: null, longitude: 10 },
      { id: "c", latitude: 120, longitude: 30 },
      { id: "d", latitude: "north", longitude: 40 },
    ],
    labels: {
      plotted: "Plotted",
      missing: "Missing coordinate",
      nonNumeric: "Not numeric",
      range: "Out of range",
      total: "All supplied rows",
    },
    showValues: true,
    copy: {
      context: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    rows: [],
    labels: {
      plotted: "Plotted",
      missing: "Missing coordinate",
      nonNumeric: "Not numeric",
      range: "Out of range",
      total: "All supplied rows",
    },
    showValues: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    rows: [
      { id: "a", latitude: 20, longitude: 40 },
      { id: "b", latitude: null, longitude: 10 },
      { id: "c", latitude: 120, longitude: 30 },
      { id: "d", latitude: "north", longitude: 40 },
      { id: "a", latitude: 20, longitude: 40 },
      { id: "b", latitude: null, longitude: 10 },
      { id: "c", latitude: 120, longitude: 30 },
      { id: "d", latitude: "north", longitude: 40 },
    ],
    labels: {
      plotted: "Plotted",
      missing: "Missing coordinate",
      nonNumeric: "Not numeric",
      range: "Out of range",
      total: "All supplied rows",
    },
    showValues: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    rows: [
      { id: "xxxxxxxxxxxxx", latitude: 0, longitude: 0 },
      { id: "b", latitude: null, longitude: 10 },
    ],
    labels: {
      plotted: "Plotted",
      missing: "Missing coordinate",
      nonNumeric: "Not numeric",
      range: "Out of range",
      total: "All supplied rows",
    },
    showValues: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    rows: [
      { id: "a", latitude: "xxxxxxxxxxx", longitude: 0 },
      { id: "b", latitude: null, longitude: 10 },
    ],
    labels: {
      plotted: "Plotted",
      missing: "Missing coordinate",
      nonNumeric: "Not numeric",
      range: "Out of range",
      total: "All supplied rows",
    },
    showValues: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
  {
    rows: [
      { id: "a", latitude: 361, longitude: 0 },
      { id: "b", latitude: null, longitude: 10 },
    ],
    labels: {
      plotted: "Plotted",
      missing: "Missing coordinate",
      nonNumeric: "Not numeric",
      range: "Out of range",
      total: "All supplied rows",
    },
    showValues: true,
    copy: {
      context: "Fictional schematic geography",
      before: "Supplied observations",
      after: "Derived display",
    },
  },
];
