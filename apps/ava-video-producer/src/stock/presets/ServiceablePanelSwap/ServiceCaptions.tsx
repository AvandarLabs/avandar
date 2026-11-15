import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./ServiceablePanelSwap.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/**
 * Labels distinguish retained neighbors and the physically removed original.
 */
export function ServiceCaptions({ input, frame }: Readonly<Props>): ReactNode {
  return (
    <g>
      <LabelSlots
        labels={[
          [input.labels.whole, 48, 58, 276, 18, 4],
          [input.labels.retained, 640, 58, 276, 18, 4],
          [input.labels.example, 48, 582, 864, 14, 1],
          [input.workerLabel, 48, 150, 220, 16, 3],
        ]}
      />
      {frame >= 117 ? (
        <LabelSlots
          labels={[
            [input.labels.changed, 345, 58, 270, 18, 4],
            [input.labels.removed, 230, 450, 640, 14, 3],
          ]}
        />
      ) : undefined}
    </g>
  );
}
