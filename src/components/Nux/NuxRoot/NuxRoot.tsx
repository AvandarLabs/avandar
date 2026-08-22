import type { ReactNode } from "react";

import { NuxRootContents } from "@/components/Nux/NuxRoot/NuxRootContents";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { useNuxEligibility } from "@/components/Nux/useNuxEligibility/useNuxEligibility";

/**
 * The onboarding tutorial's entry point.
 *
 * Ineligible users get nothing, so the `react-joyride` chunk is never
 * fetched for them. An already-running tour stays mounted if eligibility
 * flickers (a hidden window can report a tiny width): unmounting Joyride
 * would fire TOUR_END and drop the overlay.
 */
export function NuxRoot(): ReactNode {
  const isEligible = useNuxEligibility();
  const activeMilestoneKey = NuxStateManager.useState().activeMilestoneKey;
  if (!isEligible && activeMilestoneKey === undefined) {
    return null;
  }
  return <NuxRootContents />;
}
