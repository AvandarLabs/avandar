import { t } from "@lingui/core/macro";

/** Returns the boundary disclaimer shown with every map. */
export function mapDisclaimer(): string {
  return t`The boundaries and names shown do not imply official endorsement or acceptance.`;
}
