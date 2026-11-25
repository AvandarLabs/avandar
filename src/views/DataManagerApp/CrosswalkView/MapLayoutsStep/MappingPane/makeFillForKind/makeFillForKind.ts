import type { CrosswalkMapping } from "$/models/crosswalks/CrosswalkMapping/CrosswalkMapping";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";

/** The ways a column can be filled, in the order the control offers them. */
export const FILL_KINDS = [
  "column",
  "constant",
  "expression",
  "empty",
] as const;

/** One way a column can be filled. */
export type FillKind = (typeof FILL_KINDS)[number];

type Options = Readonly<{
  kind: FillKind;
  current: CrosswalkMapping.Fill | undefined;
  /** The name of the combined dataset's column being filled. */
  targetName: string;
  /** The layout's columns. */
  columnNames: readonly string[];
  /** The governing entry's primary list, for a governed column. */
  primaryCodeListId: DataDictionaryCodeList.Id | undefined;
}>;

function _pickSourceColumn(options: Options): string {
  if (options.current?.kind === "column") {
    return options.current.sourceColumn;
  }
  const targetKey = options.targetName.trim().toLowerCase();
  const sameName = options.columnNames.find((name) => {
    return name.trim().toLowerCase() === targetKey;
  });
  return sameName ?? options.columnNames[0] ?? "";
}

/**
 * The fill a column starts with when the user switches it to another kind.
 * A column fill reads the current fill's source, else the layout column
 * named like the target (ignoring case), else the layout's first column. A
 * governed column translates with its entry's primary list. Combine starts
 * as that column's placeholder, so it is never blank. Choosing the kind the
 * fill already has keeps it.
 */
export function makeFillForKind(options: Options): CrosswalkMapping.Fill {
  const { kind, current } = options;
  if (current?.kind === kind) {
    return current;
  }
  switch (kind) {
    case "column":
      return {
        kind: "column",
        sourceColumn: _pickSourceColumn(options),
        convert: undefined,
        codeListId: options.primaryCodeListId,
        holdsLabels: false,
      };
    case "constant":
      return { kind: "constant", value: "" };
    case "expression":
      return { kind: "expression", sql: `{${_pickSourceColumn(options)}}` };
    case "empty":
      return { kind: "empty" };
  }
}
