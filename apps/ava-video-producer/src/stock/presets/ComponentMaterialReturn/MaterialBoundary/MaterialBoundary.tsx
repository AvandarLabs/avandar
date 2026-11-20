import { mix } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { MaterialCaptions } from "../MaterialCaptions";
import { OutputShell } from "./OutputShell";
import { ReturnedShellDetail } from "./ReturnedShellDetail";
import type { Input } from "../ComponentMaterialReturn.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; assembled: number };
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
      <SketchedShape
        shape={{
          kind: "path",
          d: `M50 290V335H320V290M50 290L${mix(open, 320, 50)} ${mix(open, 290, 240)}`,
        }}
        profile={tokens.sketch.shape}
        data-returned-shell="physical"
        fill="none"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <ReturnedShellDetail isAppliance={isAppliance} />
      {assembled > 0 ? (
        <OutputShell frame={frame} isAppliance={isAppliance} />
      ) : undefined}
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
