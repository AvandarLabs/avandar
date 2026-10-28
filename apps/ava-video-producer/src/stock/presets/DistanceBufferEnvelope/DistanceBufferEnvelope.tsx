import { STOCK } from "../../stockPalette";
import { BufferCompass } from "./BufferCompass";
import { BufferHeadings } from "./BufferHeadings";
import { BufferLocations } from "./BufferLocations";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./DistanceBufferEnvelope.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/**
 * Straight-line inclusion separates the complete source set from its results.
 */
export function DistanceBufferEnvelope({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        x={40}
        y={182}
        width={376}
        height={376}
        fill="none"
        stroke={STOCK.line}
      />
      <BufferCompass input={input} frame={frame} accent={accent} />
      <BufferLocations input={input} frame={frame} accent={accent} />
      <BufferHeadings input={input} accent={accent} />
    </g>
  );
}
