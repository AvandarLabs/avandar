import { SceneLabel } from "./SceneLabel";
import type { Input } from "./StormwaterStorageSpill.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/** Storage labels remain above both possible overflow routes. */
export function BasinCaption({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      <SceneLabel
        text={input.copy.capacity}
        x={55}
        y={130}
        width={190}
        lines={4}
      />
      <SceneLabel
        text={`${input.detentionCapacityM3} ${input.copy.unit}`}
        x={55}
        y={205}
        width={190}
        lines={2}
      />
    </g>
  );
}
