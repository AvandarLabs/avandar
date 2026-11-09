import { Plural } from "@lingui/react/macro";
import { VisuallyHidden } from "@mantine/core";
import type { ReactNode } from "react";

type Props = {
  /** True once the current search has come back. */
  hasResult: boolean;
  resultCount: number;
};

/**
 * A polite live region that tells screen reader users how many addresses
 * the search found. It stays mounted so each new count is announced.
 */
export function AddressSearchStatus({
  hasResult,
  resultCount,
}: Props): ReactNode {
  return (
    <VisuallyHidden role="status" aria-live="polite">
      {hasResult ? (
        <Plural
          value={resultCount}
          _0="No addresses found"
          one="# address found"
          other="# addresses found"
        />
      ) : null}
    </VisuallyHidden>
  );
}
