import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { BufferClassificationToken } from "./BufferClassificationToken";
import type { Input } from "./DistanceBufferEnvelope.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/**
 * The result rail contains qualifying source identities once in source order.
 */
export function BufferInclusionLedger({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const included = input.locations
    .map((location, index) => ({ location, index }))
    .filter(
      ({ location }) =>
        Math.hypot(location.x - input.origin.x, location.y - input.origin.y) <=
        input.radiusUnits,
    );
  return (
    <g>
      {included.map(({ location, index }, ledgerIndex) => (
        <g key={location.id}>
          <BufferClassificationToken
            input={input}
            location={location}
            index={index}
            ledgerIndex={ledgerIndex}
            frame={frame}
            accent={accent}
          />
          {frame >= 129 + index * 2 ? (
            <LabelSlots
              labels={[
                [location.label, 720, 282 + ledgerIndex * 48, 200, 12, 3],
              ]}
            />
          ) : undefined}
        </g>
      ))}
    </g>
  );
}
