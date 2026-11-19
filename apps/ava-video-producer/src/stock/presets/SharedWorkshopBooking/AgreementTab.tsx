import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { getBookingFromFrame } from "./getBookingFromFrame";
import type { ReactNode } from "react";

type Props = {
  scene: ReturnType<typeof getBookingFromFrame>;
  requestId: string;
  accent: string;
};
/** A non-null authored agreement gains a tab only as it reaches the booking. */
export function AgreementTab({
  scene,
  requestId,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      {" "}
      {scene.hasBooking ? (
        <g data-agreement={requestId}>
          <SketchedShape
            shape={{
              kind: "path",
              d: `M${scene.x + scene.width - 25} ${scene.y + 20} l6 6 l11 -14`,
            }}
            profile={tokens.sketch.shape}
            stroke={accent}
            strokeWidth={scales.stroke(tokens.stroke.emphasis)}
            fill="none"
            opacity={scene.vertical}
          />
        </g>
      ) : undefined}
    </g>
  );
}
