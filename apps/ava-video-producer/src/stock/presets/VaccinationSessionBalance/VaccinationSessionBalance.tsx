import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { DoseToken } from "./DoseToken";
import { SessionCarrier } from "./SessionCarrier";
import { SessionHeadings } from "./SessionHeadings";
import { SessionRecipients } from "./SessionRecipients";
import { SessionTotals } from "./SessionTotals";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./VaccinationSessionBalance.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** The supplied stock partitions into exclusive physical destinations. */
export function VaccinationSessionBalance({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <SessionHeadings input={input} />
      <SessionCarrier frame={frame} accent={accent} />
      <SessionFurniture />
      <SessionRecipients input={input} frame={frame} accent={accent} />
      {input.units.map((unit, index) => {
        return (
          <DoseToken
            key={unit.id}
            input={input}
            unit={unit}
            index={index}
            frame={frame}
            accent={accent}
          />
        );
      })}
      <SessionTotals input={input} frame={frame} />
    </g>
  );
}

/** The session area and the remaining and discarded trays. */
function SessionFurniture(): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <>
      <StockRect
        x={280}
        y={180}
        width={375}
        height={290}
        rx={scales.corner(24)}
        fill="none"
        stroke={tokens.color.line}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: "M690 205 V280 H930 V205 M690 385 V460 H930 V385",
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
      />
    </>
  );
}
