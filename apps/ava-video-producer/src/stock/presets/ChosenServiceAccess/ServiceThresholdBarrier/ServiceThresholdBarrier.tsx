import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ChosenServiceAccess.schema";
import type { ReactNode } from "react";

type Props = {
  service: Input["services"][number];
  input: Input;
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  x: number;
  selected: boolean;
  barrier: string;
};
/** Draws the service threshold and selected access change. */
export function ServiceThresholdBarrier({
  service,
  input,
  accent,
  tokens,
  scales,
  x,
  selected,
  barrier,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d:
            input.accessChange === "unfold-ramp"
              ? `M${x - 42} 356 V326 H${x + 42}`
              : `M${x - 42} 356 H${x + 42}`,
        }}
        profile={tokens.sketch.shape}
        data-threshold={service.id}
        fill="none"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <SketchedShape
        shape={{ kind: "path", d: barrier }}
        profile={tokens.sketch.shape}
        data-barrier={service.id}
        data-barrier-selected={selected}
        fill={
          input.accessChange === "unfold-ramp" ? "none" : tokens.color.surface
        }
        stroke={selected ? accent : tokens.color.highlight}
        strokeWidth={scales.stroke(5)}
      />
    </>
  );
}
