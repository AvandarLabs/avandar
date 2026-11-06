import { EASE, mix, ramp } from "../../../motion";
import { EvolutionCaptions } from "./EvolutionCaptions";
import { EvolutionHeader } from "./EvolutionHeader";
import { EvolutionRow } from "./EvolutionRow";
import { LaterEvolutionRow } from "./LaterEvolutionRow";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./SchemaColumnEvolution.schema";
import type { ReactNode } from "react";
/** Frame-driven complete authored schema extension. */
export type Props = GraphicProps & { input: Input };
/** A new field leaves earlier collection gaps explicit. */
export function SchemaColumnEvolution({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const expansion = ramp(frame, 12, 36, EASE.inOut);
  const x = mix(expansion, 190, 80);
  return (
    <g>
      <EvolutionCaptions {...{ input, frame }} />
      <EvolutionHeader
        input={input}
        x={x}
        expansion={expansion}
        accent={accent}
      />
      {input.earlierRecords.map((record, index) => (
        <EvolutionRow
          key={record.id}
          record={record}
          x={x}
          y={220 + index * 65}
          accent={accent}
          expansion={expansion}
          missingLabel={input.fields.missingLabel}
          missingOpacity={ramp(frame, 49 + index * 6, 31)}
        />
      ))}
      <LaterEvolutionRow {...{ input, frame, x, accent, expansion }} />
    </g>
  );
}
