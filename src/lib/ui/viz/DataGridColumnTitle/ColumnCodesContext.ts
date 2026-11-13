import { createContext } from "react";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";

/**
 * The code list of each grid column that has one, by column name. A view
 * that knows which result columns are bound dataset columns provides it,
 * for example the Data Explorer, and `DataGridColumnTitle` shows a tag for
 * each. Empty by default, so other grids show no tags.
 */
export const ColumnCodesContext = createContext<
  ReadonlyMap<string, ColumnCodes.T>
>(new Map());
