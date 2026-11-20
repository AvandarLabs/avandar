import { Text } from "../../graphics-common/Text";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g data-display-map="">
      <StockRect
        x={485}
        y={174}
        width={410}
        height={245}
        fill="none"
        stroke={tokens.color.line}
      />
      {frame >= 71
        ? input.locations.map((location, index) => {
            return (
              <DisclosedMarker
                key={location.id}
                location={location}
                index={index}
                frame={frame}
                accent={accent}
              />
            );
          })
        : undefined}
      {input.locations.map((location, index) => {
        return (
          <g key={location.id} data-approximate-label={location.id}>
            <Text x={485} y={440 + index * 52} role="data">
              {index + 1}·
            </Text>
            <LabelSlots
              labels={[
                [location.label, 510, 440 + index * 52, 165, 12, 3],
                [input.labels.approximate, 695, 440 + index * 52, 220, 12, 3],
              ]}
            />
          </g>
        );
      })}
    </g>
  );
}
