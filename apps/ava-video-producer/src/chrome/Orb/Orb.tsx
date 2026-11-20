import { StageThemeBoundary } from "../../scenes/StageTheme/StageThemeBoundary";
import { OrbContent } from "./OrbContent";
import type { ReactNode } from "react";
/**
 * Stand-in for a product mark. Replace with your own. A scene palette
 * gradient inside a `components.Orb` focus ring.
 */
export function Orb({ size = 28 }: { size?: number }): ReactNode {
  return (
    <StageThemeBoundary>
      <OrbContent size={size} />
    </StageThemeBoundary>
  );
}
