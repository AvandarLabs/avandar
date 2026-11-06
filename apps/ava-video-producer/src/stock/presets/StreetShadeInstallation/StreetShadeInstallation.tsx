import { ShadeHeader } from "./ShadeHeader";
import { ShadeLegend } from "./ShadeLegend";
import { ShadeSummary } from "./ShadeSummary";
import { ShadeZone } from "./ShadeZone";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./StreetShadeInstallation.schema";
import type { ReactNode } from "react";
/** Explicit content joins the shared stock frame contract. */
export type Props = GraphicProps & { input: Input };
/**
 * Supplied shade additions unfold while all street ground remains accounted.
 */
export function StreetShadeInstallation({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <ShadeHeader input={input} />
      {input.zones.map((zone, index) => (
        <ShadeZone
          key={zone.id}
          input={input}
          index={index}
          frame={frame}
          accent={accent}
        />
      ))}
      <ShadeLegend input={input} />
      <ShadeSummary input={input} frame={frame} />
    </g>
  );
}
