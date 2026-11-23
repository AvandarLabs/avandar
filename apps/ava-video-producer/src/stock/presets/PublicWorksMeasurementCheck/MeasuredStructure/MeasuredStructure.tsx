import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { MeasurementRuler } from "../MeasurementRuler";
import { StructureDetail } from "./StructureDetail";
import type { Input } from "../PublicWorksMeasurementCheck.schema";
import type { ReactNode } from "react";
/** The dash of the promised outline the built structure is measured against. */
const PROMISED_DASH = "6 5";
type Props = { input: Input; accent: string };
/**
 * One physical dimension uses the same 65-pixel unit for promise and object.
 */
export function MeasuredStructure({
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const promisedWidth = input.specification.length * 65;
  const observedWidth = input.observation.length * 65;
  return (
    <g>
      <StockRect
        data-promised-outline=""
        x={200}
        y={266}
        width={promisedWidth}
        height={94}
        fill="none"
        stroke={tokens.color.inactive}
        strokeDasharray={PROMISED_DASH}
      />
      <StockRect
        data-actual-structure={input.structure}
        x={200}
        y={275}
        width={observedWidth}
        height={input.structure === "low-wall" ? 85 : 10}
        fill={input.structure === "low-wall" ? tokens.color.surface : accent}
        stroke={accent}
      />
      <StructureDetail
        isLowWall={input.structure === "low-wall"}
        width={observedWidth}
        accent={accent}
      />
      <MeasurementRuler />
    </g>
  );
}
