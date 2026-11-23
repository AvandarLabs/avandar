import { useCallback } from "react";
import { CustomScaleKeys } from "../CustomScaleKeys/CustomScaleKeys";
import { type TokenRow } from "../TokenRows/TokenRows.types";
/** A row's visible name: the catalog label, plus the key for a scale entry. */
export function useTokenRowLabel(): (row: TokenRow) => string {
  return useCallback((row: TokenRow) => {
    return row.scaleKey === undefined
      ? row.definition.label
      : `${row.definition.label} · ${CustomScaleKeys.humanizeScaleKey(row.scaleKey)}`;
  }, []);
}
