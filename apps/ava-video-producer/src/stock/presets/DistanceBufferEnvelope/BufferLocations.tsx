import { BufferInclusionLedger } from "./BufferInclusionLedger";
import { BufferSourceMarker } from "./BufferSourceMarker";
import { BufferSourceRow } from "./BufferSourceRow";
import type { Input } from "./DistanceBufferEnvelope.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Fixed map sources and their complete keyed rows precede inclusion results.
 */
export function BufferLocations({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.locations.map((location, index) => (
        <g key={location.id}>
          <BufferSourceMarker
            input={input}
            location={location}
            accent={accent}
          />
          <BufferSourceRow input={input} location={location} index={index} />
        </g>
      ))}
      <BufferInclusionLedger input={input} frame={frame} accent={accent} />
    </g>
  );
}
