import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./PrivateCaseConversation.schema";
import type { ReactNode } from "react";
/** Inputs for WaitingSpace. */
type Props = { input: Input; opacity: number };
/** Nearby waiting furniture and acknowledgement form the optional inset. */
export function WaitingSpace({ input, opacity }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g opacity={opacity} data-waiting-inset={input.showWaitingSupporter}>
      <StockRect
        x={650}
        y={150}
        width={262}
        height={380}
        rx={scales.corner(20)}
        fill="none"
        stroke={tokens.color.line}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: "M760 397 v54 h48 v-18 M760 451 v18 M808 451 v18",
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
      />
      <LabelSlots
        labels={[
          [input.roomLabels.waiting, 670, 173, 222, 14, 3],
          [input.copy.acknowledgement, 650, 88, 262, 14, 4],
        ]}
      />
    </g>
  );
}
