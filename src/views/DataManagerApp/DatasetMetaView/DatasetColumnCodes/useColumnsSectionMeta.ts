import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";

/**
 * The Columns section's count: `22`, or `22 · 7 with a code list: hover
 * the tag to read it` once dictionaries are attached. Undefined until the
 * columns load.
 */
export function useColumnsSectionMeta(
  options: Readonly<{
    columnCount: number | undefined;
    columnCodes: ReadonlyMap<string, ColumnCodes.T>;
  }>,
): string | undefined {
  const { t, i18n } = useLingui();
  if (options.columnCount === undefined) {
    return undefined;
  }
  const columnCountText = i18n.number(options.columnCount);
  const codedCount = [...options.columnCodes.values()].filter((codes) => {
    return codes.pairs.length > 0;
  }).length;
  if (codedCount === 0) {
    return columnCountText;
  }
  const codedText = plural(codedCount, {
    one: "# with a code list: hover the tag to read it",
    other: "# with a code list: hover the tag to read it",
  });
  return t`${columnCountText} · ${codedText}`;
}
