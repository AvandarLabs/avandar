import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./PublicationSnapshotSlice.schema";
/** Complete fictional default input. */
export const DEFAULT_INPUT: Input = {
  table: {
    columns: [
      {
        id: "site",
        label: "Site",
      },
      {
        id: "items",
        label: "Items",
      },
      {
        id: "note",
        label: "Internal note",
      },
    ],
    rows: [
      {
        id: "a",
        cells: ["West", "12", "Review"],
      },
      {
        id: "b",
        cells: ["East", "8", "Draft"],
      },
    ],
  },
  selection: {
    rowIds: ["a", "b"],
    columnIds: ["site", "items"],
  },
  liveEdit: {
    rowId: "a",
    columnId: "items",
    value: "15",
  },
  publication: {
    revision: "Revision 1",
    audience: "internal",
    label: "Published sample",
  },
  showExcludedCells: true,
  copy: {
    context: "Fictional document",
    source: "Original",
    result: "Extracted result",
  },
};

const minimum: Input = {
  ...DEFAULT_INPUT,
  table: {
    columns: [
      { id: "", label: "" },
      { id: "b", label: "x" },
    ],
    rows: [
      { id: "", cells: ["", "x"] },
      { id: "b", cells: ["y", "z"] },
    ],
  },
  selection: { rowIds: [""], columnIds: [""] },
  liveEdit: { rowId: "", columnId: "", value: "new" },
  showExcludedCells: false,
};
const dense: Input = {
  ...DEFAULT_INPUT,
  table: {
    columns: ["a", "b", "c", "d"].map((id) => ({
      id: id.repeat(18),
      label: "W".repeat(18),
    })),
    rows: ["a", "b", "c", "d"].map((id) => ({
      id: id.repeat(18),
      cells: Array.from({ length: 4 }, () => "W".repeat(18)),
    })),
  },
  selection: {
    rowIds: ["d", "c", "b", "a"].map((id) => id.repeat(18)),
    columnIds: ["d", "c", "b", "a"].map((id) => id.repeat(18)),
  },
  liveEdit: {
    rowId: "a".repeat(18),
    columnId: "b".repeat(18),
    value: "X".repeat(18),
  },
  publication: {
    revision: "W".repeat(24),
    audience: "public",
    label: "W".repeat(24),
  },
  copy: {
    context: "W".repeat(34),
    source: "W".repeat(34),
    result: "W".repeat(34),
  },
};
const changed: Input = {
  ...DEFAULT_INPUT,
  selection: { rowIds: ["b", "a"], columnIds: ["items", "site"] },
  liveEdit: { rowId: "a", columnId: "items", value: "" },
  publication: { ...DEFAULT_INPUT.publication, audience: "public" },
  showExcludedCells: false,
};
/**
 * Single empty-key cell, full reversed slice and empty edited-value examples.
 */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: minimum },
  { id: "dense", input: dense },
  { id: "changed", input: changed },
];
/**
 * Rejected table shapes, nonmembership, duplicate references and unchanged
 * edits.
 */
export const invalidInputs: unknown[] = [
  undefined,
  {},
  { ...DEFAULT_INPUT, extra: true },
  { ...DEFAULT_INPUT, table: { ...DEFAULT_INPUT.table, columns: [] } },
  {
    ...DEFAULT_INPUT,
    table: {
      ...DEFAULT_INPUT.table,
      rows: [DEFAULT_INPUT.table.rows[0], DEFAULT_INPUT.table.rows[0]],
    },
  },
  {
    ...DEFAULT_INPUT,
    table: {
      ...DEFAULT_INPUT.table,
      rows: DEFAULT_INPUT.table.rows.map((r) => ({ ...r, cells: [] })),
    },
  },
  ...[
    { rowIds: [], columnIds: ["site"] },
    { rowIds: ["a", "a"], columnIds: ["site"] },
    { rowIds: ["ghost"], columnIds: ["site"] },
  ].map((selection) => ({ ...DEFAULT_INPUT, selection })),
  { ...DEFAULT_INPUT, liveEdit: { ...DEFAULT_INPUT.liveEdit, value: "12" } },
  {
    ...DEFAULT_INPUT,
    liveEdit: { ...DEFAULT_INPUT.liveEdit, columnId: "note" },
  },
  {
    ...DEFAULT_INPUT,
    table: {
      ...DEFAULT_INPUT.table,
      columns: DEFAULT_INPUT.table.columns.map((c) => ({
        ...c,
        id: "x".repeat(19),
      })),
    },
  },
  {
    ...DEFAULT_INPUT,
    table: {
      ...DEFAULT_INPUT.table,
      rows: DEFAULT_INPUT.table.rows.map((r) => ({ ...r, id: "x".repeat(19) })),
    },
  },
  {
    ...DEFAULT_INPUT,
    liveEdit: { ...DEFAULT_INPUT.liveEdit, value: "x".repeat(19) },
  },
];
