import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { SceneText } from "./SceneText";
import type { Input } from "./SchoolCostSatchel.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string; total: number };
/** Draws the scene's SatchelTotal group with fixed authored geometry. */
export function SatchelTotal({
  input,
  frame,
  accent,
  total,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  return (
    <>
      <g opacity={motion.reveal(frame, 108)}>
        <g data-total-bracket="true">
          <SketchedShape
            shape={{ kind: "path", d: "M333 487 V497 H915 V487 M624 497 V510" }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={accent}
          />
        </g>
        <SceneText
          text={input.sceneLabels.total}
          slot={[95, 505, 230, 16, 3]}
        />
        <SceneText
          text={String(total)}
          anchor="middle"
          slot={[624, 538, 240, 28, 1]}
        />
      </g>
    </>
  );
}
