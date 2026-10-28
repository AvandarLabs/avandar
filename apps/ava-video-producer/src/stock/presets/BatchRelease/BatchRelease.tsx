import { ramp } from "../../../motion";
import { BatchEnvelope } from "./BatchEnvelope";
import { BatchHeadings } from "./BatchHeadings";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./BatchRelease.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/** Separate arrivals become intact batches that cross one dispatch boundary. */
export function BatchRelease({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 12, 12)}>
      <BatchHeadings input={input} />
      {input.batches.map((batch, index) => (
        <BatchEnvelope
          key={batch.id}
          batch={batch}
          index={index}
          input={input}
          frame={frame}
          accent={accent}
        />
      ))}
    </g>
  );
}
