import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./SupportRequestResponse.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * The same visibly unfinished document or assembly remains at its owner's desk.
 */
export function SupportWorktable({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
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
          strokeDasharray={atomic.dash.long.join(" ")}
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
          strokeDasharray={tokens.dash.placeholder.join(" ")}
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
