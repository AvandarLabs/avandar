import { Text } from "../../graphics-common";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { DisclosedMarker } from "./DisclosedMarker";
import type { Input } from "./BoundedLocationDisplacement.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** An initially empty public map receives only approximate displaced marks. */
export function PublicDisplacementMap({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g data-display-map="">
      <rect
        x={485}
        y={174}
        width={410}
        height={245}
        fill="none"
        stroke={STOCK.line}
      />
      {frame >= 71
        ? input.locations.map((location, index) => (
            <DisclosedMarker
              key={location.id}
              location={location}
              index={index}
              frame={frame}
              accent={accent}
            />
          ))
        : undefined}
      {input.locations.map((location, index) => (
        <g key={location.id} data-approximate-label={location.id}>
          <Text x={485} y={440 + index * 52} size={12}>
            {index + 1}·
          </Text>
          <LabelSlots
            labels={[
              [location.label, 510, 440 + index * 52, 165, 12, 3],
              [input.labels.approximate, 695, 440 + index * 52, 220, 12, 3],
            ]}
          />
        </g>
      ))}
    </g>
  );
}
