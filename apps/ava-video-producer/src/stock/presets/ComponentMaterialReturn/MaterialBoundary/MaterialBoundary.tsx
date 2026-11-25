import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { MaterialCaptions } from "../MaterialCaptions";
import { ReturnedShell } from "./ReturnedShell";
import type { Input } from "../ComponentMaterialReturn.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  assembled: number;
};

/**
 * Distinct returned and output silhouettes never suggest a zero-mass assembly.
 */
export function MaterialBoundary({
  input,
  frame,
  assembled,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const open = motion.reveal(frame, 24);
  const isAppliance = input.assemblyShape === "appliance";
  return (
    <g>
      <ReturnedShell
        frame={frame}
        assembled={assembled}
        tokens={tokens}
        scales={scales}
        open={open}
        isAppliance={isAppliance}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M740 290V335H930V290M740 355V400H930V355" }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <MaterialCaptions input={input} />
    </g>
  );
}
