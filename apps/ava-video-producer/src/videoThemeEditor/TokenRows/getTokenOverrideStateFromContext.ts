import { getValueAtPath } from "../../videoTheme/getValueAtPath";
import type { RowContext, TokenOverrideState } from "./TokenRows.types";
/** Identifies whether a draft scope or saved item supplies a token value. */
export function getTokenOverrideStateFromContext({
  context,
  documentPath,
}: Readonly<{
  context: RowContext;
  documentPath: readonly string[];
}>): TokenOverrideState {
  return getValueAtPath({
    source: context.scopePatch,
    path: documentPath,
  }) !== undefined
    ? "draft"
    : getValueAtPath({
          source: context.savedOverride,
          path: documentPath,
        }) !== undefined
      ? "saved"
      : "none";
}
