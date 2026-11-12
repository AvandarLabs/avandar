import { IconSparkles } from "@tabler/icons-react";
import type { ReactNode } from "react";

/**
 * A sparkle beside a label that is still an unchecked suggestion. It is
 * decoration only: the label field's description says it is suggested.
 */
export function SuggestedLabelMarker(): ReactNode {
  return <IconSparkles size={14} aria-hidden />;
}
