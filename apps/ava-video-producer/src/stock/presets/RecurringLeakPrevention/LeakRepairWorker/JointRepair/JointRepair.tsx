import { SketchedShape } from "../../../../primitives/SketchedShape";
import { RepairGesture } from "./RepairGesture";
import type { GraphicThemeHooks } from "../../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../../RecurringLeakPrevention.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  frame: number;
  accent: string;
};

type Props = Pick<ParentProps, "input" | "frame" | "accent"> & {
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  intervention: number;
};

/** Renders the joint repair in authored paint order. */
export function JointRepair({
  input,
  frame,
  accent,
  tokens,
  motion,
  scales,
  intervention,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={motion.ramp(frame, 63, motion.whip)}>
      <SketchedShape
        shape={{ kind: "circle", cx: 480, cy: 260, r: 18 }}
        profile={tokens.sketch.shape}
        data-joint-repair="true"
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
      />
      <RepairGesture
        input={input}
        accent={accent}
        tokens={tokens}
        scales={scales}
        intervention={intervention}
      />
    </g>
  );
}
