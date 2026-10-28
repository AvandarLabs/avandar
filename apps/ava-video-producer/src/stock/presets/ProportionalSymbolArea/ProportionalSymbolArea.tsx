import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { AreaLegend } from "./AreaLegend";
import { AreaSite } from "./AreaSite";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ProportionalSymbolArea.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** Equal-area unit tiles reshape into circles at fixed authored sites. */
export function ProportionalSymbolArea({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 0, 12)}>
      <LabelSlots
        labels={[
          [input.copy.context, 48, 28, 864, 14, 1],
          [input.copy.before, 48, 76, 400, 14, 3],
          [input.copy.after, 516, 76, 396, 14, 3],
        ]}
      />
      <rect
        x={48}
        y={148}
        width={400}
        height={400}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      {input.sites.map((site, index) => (
        <AreaSite key={site.id} {...{ site, index, input, frame, accent }} />
      ))}
      <AreaLegend {...{ input, frame, accent }} />
    </g>
  );
}
