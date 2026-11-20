import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DoseToken } from "./DoseToken";
import { SessionCarrier } from "./SessionCarrier";
import { SessionFurniture } from "./SessionFurniture";
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
