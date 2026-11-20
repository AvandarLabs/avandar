import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { MaterialCaptions } from "./MaterialCaptions";
import type { Input } from "./ComponentMaterialReturn.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; assembled: number };
/** The assembled shell's own corners: a rounded appliance, a squared module. */
const APPLIANCE_CORNER = 12;
const MODULE_CORNER = 2;

/**
 * Distinct returned and output silhouettes never suggest a zero-mass assembly.
 */
export function MaterialBoundary({
  input,
  frame,
  assembled,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
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

/** A dial on a returned appliance, or feet on a returned module. */
function ReturnedShellDetail({
  isAppliance,
}: Readonly<{ isAppliance: boolean }>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  if (isAppliance) {
    return (
      <SketchedShape
        shape={{ kind: "circle", cx: 185, cy: 325, r: 6 }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.inactive}
      />
    );
  }
  return (
    <SketchedShape
      shape={{ kind: "path", d: "M65 335v8M305 335v8" }}
      profile={tokens.sketch.shape}
      stroke={tokens.color.inactive}
      strokeWidth={scales.stroke(tokens.stroke.emphasis)}
    />
  );
}

/** The output assembly's own shell, appearing once parts are assembled. */
function OutputShell({
  frame,
  isAppliance,
}: Readonly<{ frame: number; isAppliance: boolean }>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  return (
    <StockRect
      data-output-shell="physical"
      x={408}
      y={288}
      width={305}
      height={48}
      rx={scales.corner(isAppliance ? APPLIANCE_CORNER : MODULE_CORNER)}
      fill="none"
      stroke={tokens.color.line}
      strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      opacity={motion.reveal(frame, 108)}
    />
  );
}
