import { ramp } from "../../../motion";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./StreetShadeInstallation.schema";
import type { ReactNode } from "react";
/** Inputs for ShadeSummary. */
type Props = { input: Input; frame: number };

/** Resolved quantities retain their supplied denominator and copy. */
export function ShadeSummary({ input, frame }: Readonly<Props>): ReactNode {
  const total = input.zones.reduce((sum, zone) => sum + zone.areaM2, 0);
  const shaded =
    input.zones.reduce((sum, zone) => sum + zone.existingShadeM2, 0) +
    input.installations.reduce((sum, item) => sum + item.addedShadeM2, 0);
  return (
    <g>
      <g
        data-shaded="total"
        data-quantity={shaded}
        data-denominator={total}
        opacity={ramp(frame, 108, 12)}
      >
        {input.showAreaBalance ? (
          <SceneLabel
            text={`${input.copy.shaded}: ${shaded} + ${input.copy.unshaded}: ${total - shaded} = ${total} ${input.copy.unit}`}
            x={45}
            y={552}
            width={865}
            lines={2}
          />
        ) : undefined}
      </g>
      <SceneLabel
        text={input.copy.disclaimer}
        x={45}
        y={590}
        width={865}
        lines={1}
      />
    </g>
  );
}
