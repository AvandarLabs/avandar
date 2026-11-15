import { STOCK } from "../../stockPalette";
import type { Input } from "./DisclosureAperture.schema";
import type { ReactNode } from "react";

type Props = { policy: Input["fields"][number]["disclosure"]; accent: string };
/**
 * Distinct circle and diamond shapes reinforce the supplied policy captions.
 */
export function DisclosurePolicyMark({
  policy,
  accent,
}: Readonly<Props>): ReactNode {
  return policy === "share" ? (
    <circle data-policy-mark="share" cx={22} cy={12} r={4} fill={accent} />
  ) : (
    <path
      data-policy-mark="retain"
      d="M22 7 l5 5 l-5 5 l-5 -5 z"
      fill={STOCK.orange}
    />
  );
}
