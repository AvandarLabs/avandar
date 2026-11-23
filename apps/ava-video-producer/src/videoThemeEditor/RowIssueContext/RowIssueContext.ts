import { createContext, useContext } from "react";

/**
 * Whether the token row around a control has a resolver problem. `TokenRow`
 * provides it, and the shared inputs read it to show Mantine's error state,
 * which also marks the input `aria-invalid`.
 */
export const RowIssueContext = createContext(false);

/** True inside a token row whose value does not resolve. */
export function useRowHasIssue(): boolean {
  return useContext(RowIssueContext);
}
