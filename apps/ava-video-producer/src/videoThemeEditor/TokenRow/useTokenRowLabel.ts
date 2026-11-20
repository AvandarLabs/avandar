import { useCallback } from "react";
import { humanizeScaleKey } from "../customScaleKey/customScaleKey";
import { type TokenRow } from "../tokenRows/tokenRows.types";
/** A row's visible name: the catalog label, plus the key for a scale entry. */
export function useTokenRowLabel(): (row: TokenRow) => string {
  return useCallback((row: TokenRow) => {
    return row.scaleKey === undefined
      ? row.definition.label
      : `${row.definition.label} · ${humanizeScaleKey(row.scaleKey)}`;
  }, []);
}
