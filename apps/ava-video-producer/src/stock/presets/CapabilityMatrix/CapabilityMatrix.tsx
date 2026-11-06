import { CapabilityFocus } from "./CapabilityFocus";
import { CapabilityGrid } from "./CapabilityGrid";
import { CapabilityLegend } from "./CapabilityLegend";
import { CapabilityRow } from "./CapabilityRow";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./CapabilityMatrix.schema";
import type { ReactNode } from "react";
/** Frame-controlled categorical matrix with complete authored content. */
export type Props = GraphicProps & { input: Input };
/** A scanning rule resolves comparable categorical statements row by row. */
export function CapabilityMatrix({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <CapabilityGrid frame={frame} input={input} />
      {input.capabilities.map((row, index) => (
        <CapabilityRow key={row.id} {...{ row, index, input, frame }} />
      ))}
      <CapabilityFocus frame={frame} input={input} accent={accent} />
      <CapabilityLegend frame={frame} input={input} />
    </g>
  );
}
