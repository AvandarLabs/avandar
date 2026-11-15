import type { Input } from "./QueryColumnCacheGrowth.schema";
/** Complete fictional default, used only for omitted input. */
export const DEFAULT_INPUT: Input = {
  columns: [
    { id: "key", label: "Key", cells: ["A", "B", "B"] },
    { id: "name", label: "Name", cells: ["Ash", "Birch", "Birch"] },
    { id: "value", label: "Items", cells: ["2", "4", "4"] },
  ],
  cachedColumnIds: ["key", "name"],
  requests: [
    { label: "Read names", columnIds: ["name"] },
    { label: "Read items", columnIds: ["key", "value"] },
  ],
  keyColumnId: "key",
  showSetNotation: true,
  copy: { context: "Fictional example", before: "Before", after: "After" },
};
/** Default, minimum, dense and changed semantic documents. */
export const FIXTURES: Array<{ id: string; input: Input }> = [
  {
    id: "default",
    input: {
      columns: [
        { id: "key", label: "Key", cells: ["A", "B", "B"] },
        { id: "name", label: "Name", cells: ["Ash", "Birch", "Birch"] },
        { id: "value", label: "Items", cells: ["2", "4", "4"] },
      ],
      cachedColumnIds: ["key", "name"],
      requests: [
        { label: "Read names", columnIds: ["name"] },
        { label: "Read items", columnIds: ["key", "value"] },
      ],
      keyColumnId: "key",
      showSetNotation: true,
      copy: { context: "Fictional example", before: "Before", after: "After" },
    },
  },
  {
    id: "minimum",
    input: {
      columns: [
        { id: "k", label: "K", cells: ["", ""] },
        { id: "v", label: "V", cells: ["", ""] },
      ],
      cachedColumnIds: ["k"],
      requests: [
        { label: "A", columnIds: ["k"] },
        { label: "B", columnIds: ["v"] },
      ],
      keyColumnId: "k",
      showSetNotation: false,
      copy: { context: "Fictional example", before: "Before", after: "After" },
    },
  },
  {
    id: "dense",
    input: {
      columns: [
        {
          id: "aaaaaaaaaaaa",
          label: "WWWWWWWWWWWWWWWWWW",
          cells: [
            "WWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWW",
          ],
        },
        {
          id: "bbbbbbbbbbbb",
          label: "WWWWWWWWWWWWWWWWWW",
          cells: [
            "WWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWW",
          ],
        },
        {
          id: "cccccccccccc",
          label: "WWWWWWWWWWWWWWWWWW",
          cells: [
            "WWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWW",
          ],
        },
        {
          id: "dddddddddddd",
          label: "WWWWWWWWWWWWWWWWWW",
          cells: [
            "WWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWW",
          ],
        },
        {
          id: "eeeeeeeeeeee",
          label: "WWWWWWWWWWWWWWWWWW",
          cells: [
            "WWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWW",
          ],
        },
      ],
      cachedColumnIds: ["aaaaaaaaaaaa", "bbbbbbbbbbbb"],
      requests: [
        { label: "WWWWWWWWWWWWWWWWWWWWWWWW", columnIds: ["bbbbbbbbbbbb"] },
        {
          label: "WWWWWWWWWWWWWWWWWWWWWWWW",
          columnIds: [
            "aaaaaaaaaaaa",
            "bbbbbbbbbbbb",
            "cccccccccccc",
            "dddddddddddd",
            "eeeeeeeeeeee",
          ],
        },
      ],
      keyColumnId: "aaaaaaaaaaaa",
      showSetNotation: true,
      copy: {
        context: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        before: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        after: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
    },
  },
  {
    id: "changed",
    input: {
      columns: [
        { id: "key", label: "Key", cells: ["A", "B", "B"] },
        { id: "name", label: "Name", cells: ["", "\t", " "] },
        { id: "value", label: "Items", cells: ["2", "4", "4"] },
      ],
      cachedColumnIds: ["key", "name"],
      requests: [
        { label: "Read names", columnIds: ["name"] },
        { label: "Read items", columnIds: ["value"] },
      ],
      keyColumnId: "key",
      showSetNotation: false,
      copy: { context: "Fictional example", before: "Before", after: "After" },
    },
  },
];
/** Invalid structures, bounds, and cross references. */
export const invalidInputs: unknown[] = [
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, columns: [] },
  { ...DEFAULT_INPUT, columns: Array(6).fill(DEFAULT_INPUT.columns[0]) },
  {
    ...DEFAULT_INPUT,
    columns: [DEFAULT_INPUT.columns[0], DEFAULT_INPUT.columns[0]],
  },
  {
    ...DEFAULT_INPUT,
    columns: [
      { ...DEFAULT_INPUT.columns[0], cells: ["A"] },
      ...DEFAULT_INPUT.columns.slice(1),
    ],
  },
  {
    ...DEFAULT_INPUT,
    columns: [
      { ...DEFAULT_INPUT.columns[0], cells: ["A", "B"] },
      ...DEFAULT_INPUT.columns.slice(1),
    ],
  },
  {
    ...DEFAULT_INPUT,
    columns: [
      { ...DEFAULT_INPUT.columns[0], cells: Array(6).fill("") },
      ...DEFAULT_INPUT.columns.slice(1),
    ],
  },
  { ...DEFAULT_INPUT, cachedColumnIds: [] },
  { ...DEFAULT_INPUT, cachedColumnIds: ["key", "key"] },
  { ...DEFAULT_INPUT, cachedColumnIds: ["missing"] },
  { ...DEFAULT_INPUT, keyColumnId: "value" },
  { ...DEFAULT_INPUT, keyColumnId: "missing" },
  { ...DEFAULT_INPUT, requests: [] },
  { ...DEFAULT_INPUT, requests: [DEFAULT_INPUT.requests[0]] },
  {
    ...DEFAULT_INPUT,
    requests: [...DEFAULT_INPUT.requests, DEFAULT_INPUT.requests[1]],
  },
  {
    ...DEFAULT_INPUT,
    requests: [{ label: "A", columnIds: ["value"] }, DEFAULT_INPUT.requests[1]],
  },
  {
    ...DEFAULT_INPUT,
    requests: [DEFAULT_INPUT.requests[0], { label: "B", columnIds: ["name"] }],
  },
  {
    ...DEFAULT_INPUT,
    requests: [
      DEFAULT_INPUT.requests[0],
      { label: "B", columnIds: ["missing"] },
    ],
  },
  {
    ...DEFAULT_INPUT,
    requests: [
      DEFAULT_INPUT.requests[0],
      { label: "B", columnIds: ["value", "value"] },
    ],
  },
  { ...DEFAULT_INPUT, showSetNotation: 1 },
  {
    ...DEFAULT_INPUT,
    columns: DEFAULT_INPUT.columns.map((item, index) =>
      index === 0 ? { ...item, id: "" } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    columns: DEFAULT_INPUT.columns.map((item, index) =>
      index === 0 ? { ...item, id: "W".repeat(13) } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    columns: DEFAULT_INPUT.columns.map((item, index) =>
      index === 0 ? { ...item, label: "" } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    columns: DEFAULT_INPUT.columns.map((item, index) =>
      index === 0 ? { ...item, label: "W".repeat(19) } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    columns: DEFAULT_INPUT.columns.map((item, index) =>
      index === 0
        ? {
            ...item,
            cells: item.cells.map((cell, cellIndex) =>
              cellIndex === 0 ? "W".repeat(17) : cell,
            ),
          }
        : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    cachedColumnIds: DEFAULT_INPUT.cachedColumnIds.map((item, index) =>
      index === 0 ? "" : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    cachedColumnIds: DEFAULT_INPUT.cachedColumnIds.map((item, index) =>
      index === 0 ? "W".repeat(13) : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    requests: DEFAULT_INPUT.requests.map((item, index) =>
      index === 0 ? { ...item, label: "" } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    requests: DEFAULT_INPUT.requests.map((item, index) =>
      index === 0 ? { ...item, label: "W".repeat(25) } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    requests: DEFAULT_INPUT.requests.map((item, index) =>
      index === 0
        ? {
            ...item,
            columnIds: item.columnIds.map((columnId, columnIndex) =>
              columnIndex === 0 ? "" : columnId,
            ),
          }
        : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    requests: DEFAULT_INPUT.requests.map((item, index) =>
      index === 0
        ? {
            ...item,
            columnIds: item.columnIds.map((columnId, columnIndex) =>
              columnIndex === 0 ? "W".repeat(13) : columnId,
            ),
          }
        : item,
    ),
  },
  { ...DEFAULT_INPUT, keyColumnId: "" },
  { ...DEFAULT_INPUT, keyColumnId: "W".repeat(13) },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, context: "" } },
  {
    ...DEFAULT_INPUT,
    copy: { ...DEFAULT_INPUT.copy, context: "W".repeat(39) },
  },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, before: "" } },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, before: "W".repeat(39) } },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, after: "" } },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, after: "W".repeat(39) } },
  {
    ...DEFAULT_INPUT,
    columns: DEFAULT_INPUT.columns.map((item, index) =>
      index === 0 ? { ...item, extra: true } : item,
    ),
  },
  {
    ...DEFAULT_INPUT,
    requests: DEFAULT_INPUT.requests.map((item, index) =>
      index === 0 ? { ...item, extra: true } : item,
    ),
  },
  { ...DEFAULT_INPUT, copy: { ...DEFAULT_INPUT.copy, extra: true } },
];
