import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./SupportRequestResponse.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** The dash of a form task's placeholder fields. */
const FORM_DASH = "5 5";
/** The dash of a document task's placeholder lines. */
const DOCUMENT_DASH = "6 6";
/**
 * The same visibly unfinished document or assembly remains at its owner's desk.
 */
export function SupportWorktable({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  return (
    <g opacity={motion.reveal(frame, 16)}>
      <LabelSlots labels={[[input.task.label, 320, 238, 290, 16, 3]]} />
      <StockRect
        data-unfinished-task={input.task.kind}
        data-owner={input.people.requester}
        x={330}
        y={310}
        width={240}
        height={55}
        rx={scales.corner(3)}
        fill={tokens.color.surface}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      {input.task.kind === "document" ? (
        <SketchedShape
          shape={{ kind: "path", d: "M350 325 h115 M350 340 h75 M480 340 h65" }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.inactive}
          strokeDasharray={DOCUMENT_DASH}
          fill="none"
        />
      ) : (
        <SketchedShape
          shape={{
            kind: "path",
            d: "M355 325 h60 v25 h-60 Z M475 325 h65 v25 h-65 Z M415 338 h60",
          }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.inactive}
          strokeDasharray={FORM_DASH}
          fill="none"
        />
      )}
      <SketchedShape
        shape={{
          kind: "path",
          d: "M300 370 H640 V388 H300 Z M320 388 V425 M620 388 V425",
        }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        fill={tokens.color.surface}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: "M205 365 v42 h55 v-42 M215 407 v18 M250 407 v18",
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        fill="none"
      />
    </g>
  );
}
