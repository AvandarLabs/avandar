import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../RecurringLeakPrevention.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  frame: number;
  accent: string;
};

type Props = {
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  intervention: number;
};

/** Renders the tightening tool in authored paint order. */
export function TighteningTool(options: Readonly<Props>): ReactNode {
  return (
    <g
      transform={`rotate(${Motion.mix({
        t: options.intervention,
        from: -35,
        to: 35,
      })} 480 260)`}
    >
      <SketchedShape
        shape={{ kind: "path", d: "M480 260 l-22 30 l-8 -8" }}
        profile={options.tokens.sketch.shape}
        stroke={options.accent}
        strokeWidth={options.scales.stroke(5)}
        fill="none"
      />
    </g>
  );
}
