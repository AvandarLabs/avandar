import { NuxRootContents } from "@/components/Nux/NuxRoot/NuxRootContents";
import { useNuxEligibility } from "@/components/Nux/useNuxEligibility/useNuxEligibility";
import type { ReactNode } from "react";

/**
 * The onboarding tutorial's entry point.
 *
 * Renders literally nothing for an ineligible user, which also means the
 * `react-joyride` chunk is never fetched for them.
 */
export function NuxRoot(): ReactNode {
  const isEligible = useNuxEligibility();
  if (!isEligible) {
    return null;
  }
  return <NuxRootContents />;
}
