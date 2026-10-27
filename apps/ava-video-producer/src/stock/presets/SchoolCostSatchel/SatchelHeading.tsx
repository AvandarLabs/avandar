import { SceneText } from "./SceneText";
import type { Input } from "./SchoolCostSatchel.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/** Draws the scene's SatchelHeading group with fixed authored geometry. */
export function SatchelHeading({ input }: Readonly<Props>): ReactNode {
  return (
    <>
      <SceneText
        text={input.periodLabel}
        anchor="middle"
        slot={[480, 52, 830, 18, 2]}
      />
      <SceneText
        text={input.unitLabel}
        anchor="middle"
        slot={[600, 120, 570, 14, 1]}
      />
      <SceneText
        text={input.sceneLabels.school}
        anchor="middle"
        slot={[140, 100, 180, 14, 3]}
      />
    </>
  );
}
