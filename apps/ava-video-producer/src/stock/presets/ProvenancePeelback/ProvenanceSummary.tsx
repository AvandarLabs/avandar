import { mix } from "../../../motion";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CitationTab } from "./CitationTab";
import { SummaryCopy } from "./SummaryCopy";
import type { Input } from "./ProvenancePeelback.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Lift the statement while keeping its citation aligned to the sheet edge. */
export function ProvenanceSummary({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const peeling = motion.ramp(
    frame,
    40,
    motion.scale(64),
    motion.travel.easing,
  );
  return (
    <g
      data-summary-strip="statement"
      transform={`translate(${mix(peeling, 100, 64)} ${mix(peeling, 160, 96)})`}
      opacity={motion.reveal(frame, 12)}
    >
      <StockRect
        x={0}
        y={0}
        width={400}
        height={250}
        rx={scales.corner(3)}
        fill={tokens.color.elevated}
        stroke={tokens.color.line}
      />
      <SummaryCopy summary={input.summary} accent={accent} />
      <CitationTab label={input.citationLabel} frame={frame} accent={accent} />
    </g>
  );
}
