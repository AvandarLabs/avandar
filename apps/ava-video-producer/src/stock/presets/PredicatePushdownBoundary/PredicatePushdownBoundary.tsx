import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { PushdownLedger } from "./PushdownLedger";
import { PushdownPredicate } from "./PushdownPredicate/PushdownPredicate";
import { PushdownRows } from "./PushdownRows/PushdownRows";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./PredicatePushdownBoundary.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
const INTRO_FRAMES = 12;
/** Source gates filter row copies before they cross a transfer boundary. */
export function PredicatePushdownBoundary({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps(
    "PredicatePushdownBoundary",
    {},
  );
  const { color, sketch } = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g opacity={motion.ramp(frame, 0, motion.scale(INTRO_FRAMES))}>
      <LabelSlots
        labels={[
          [input.copy.context, 48, 28, 864, 14, 1],
          [input.copy.source, 48, 55, 400, 12, 3],
          [input.copy.result, 564, 55, 348, 12, 3],
          [input.labels.source, 48, 188, 348, 12, 3],
          [input.labels.destination, 564, 188, 348, 12, 3],
        ]}
      />
      <PushdownPredicate {...{ frame, input, accent }} />
      <SketchedShape
        shape={{ kind: "path", d: "M500 192 V572" }}
        profile={sketch.shape}
        data-boundary="true"
        stroke={color.line}
        strokeWidth={scales.stroke(style.boundaryWidth)}
        strokeDasharray={style.boundaryDash.join(" ")}
      />
      <PushdownRows {...{ frame, input, accent }} />
      <PushdownLedger {...{ input, frame }} />
    </g>
  );
}
