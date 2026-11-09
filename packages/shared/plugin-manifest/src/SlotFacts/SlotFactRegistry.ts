/** The value type of a fact a slot exposes to `when` conditions. */
export type FactType = "boolean" | "number" | "string";

/**
 * Every contribution slot and the facts it exposes to `when` conditions. A
 * manifest condition on a fact its slot does not list fails validation.
 */
export const SlotFactRegistry = {
  "dataExplorer.toolbar": {
    hasResult: "boolean",
    rowCount: "number",
    columnCount: "number",
    numericColumnCount: "number",
    dateColumnCount: "number",
  },
} as const satisfies Readonly<
  Record<string, Readonly<Record<string, FactType>>>
>;

/** A contribution slot, such as `dataExplorer.toolbar`. */
export type SlotId = keyof typeof SlotFactRegistry;

/** Every slot ID, as a non-empty tuple for schema enums. */
export const SLOT_IDS = Object.keys(SlotFactRegistry) as [SlotId, ...SlotId[]];
