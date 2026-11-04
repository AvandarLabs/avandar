import { SceneLabel } from "./SceneLabel";
import { WaterDestinationKey } from "./WaterDestinationKey";
import type { Input } from "./StormwaterStorageSpill.schema";
import type { WaterDestination } from "./waterDestinationKeys";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  destination: WaterDestination;
  index: number;
  amount: number;
};
/**
 * The stable key owns both the authored caption and its exact conserved volume.
 */
export function WaterDestinationCaption({
  input,
  destination,
  index,
  amount,
}: Readonly<Props>): ReactNode {
  return (
    <g data-destination={destination}>
      <WaterDestinationKey
        destination={destination}
        location="caption"
        x={40 + index * 220}
        y={436}
      />
      <SceneLabel
        text={input.copy[destination]}
        x={55 + index * 220}
        y={440}
        width={210}
        lines={3}
      />
      <SceneLabel
        text={`${amount} ${input.copy.unit}`}
        x={55 + index * 220}
        y={492}
        width={190}
        lines={3}
      />
    </g>
  );
}
