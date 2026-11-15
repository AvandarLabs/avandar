import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import {
  useGraphicMotion,
  useGraphicProps,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { PushdownLedger } from "./PushdownLedger";
import { PushdownPredicate } from "./PushdownPredicate";
import { PushdownRows } from "./PushdownRows";
import type { GraphicProps } from "../../graphics-common";
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
  const style = useGraphicProps("PredicatePushdownBoundary", {});
  const { color } = useGraphicTokens();
  const motion = useGraphicMotion();
  return (
    <g opacity={ramp(frame, 0, motion.scale(INTRO_FRAMES))}>
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
      <path
        data-boundary="true"
        d="M500 192 V572"
        stroke={color.line}
        strokeWidth={style.boundaryWidth}
        strokeDasharray={style.boundaryDash.join(" ")}
      />
      <PushdownRows {...{ frame, input, accent }} />
      <PushdownLedger {...{ input, frame }} />
    </g>
  );
}
