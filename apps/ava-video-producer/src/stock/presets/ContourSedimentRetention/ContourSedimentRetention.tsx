import { ContourLabels } from "./ContourLabels";
import { ContourTreatment } from "./ContourTreatment";
import { SedimentFlow } from "./SedimentFlow";
import { SedimentQuantities } from "./SedimentQuantities";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ContourSedimentRetention.schema";
import type { ReactNode } from "react";
/** Explicit content joins the shared stock frame contract. */
export type Props = GraphicProps & { input: Input };
/** Authored sediment settles inside and outside an unchanged mass boundary. */
export function ContourSedimentRetention({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <ContourLabels input={input} />
      <SedimentFlow input={input} frame={frame} />
      <ContourTreatment input={input} frame={frame} accent={accent} />
      <SedimentQuantities input={input} />
    </g>
  );
}
