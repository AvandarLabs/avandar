import { STOCK } from "../../stockPalette";
import { SceneLabel } from "./SceneLabel";
import {
  WATER_DESTINATIONS,
  type WaterDestination,
} from "./waterDestinationKeys";
import type { ReactNode } from "react";

type Props = {
  destination: WaterDestination;
  location: "physical" | "caption";
  x: number;
  y: number;
};
/**
 * Identical visible numbers and colors bind a physical stream to its caption.
 */
export function WaterDestinationKey({
  destination,
  location,
  x,
  y,
}: Readonly<Props>): ReactNode {
  const key = WATER_DESTINATIONS[destination];
  return (
    <g data-water-key={`${location}-${destination}`}>
      <circle cx={x} cy={y} r={8} fill={key.color} />
      <SceneLabel
        text={String(key.number)}
        x={x - 4}
        y={y + 4}
        width={10}
        lines={1}
        color={STOCK.ground}
      />
    </g>
  );
}
