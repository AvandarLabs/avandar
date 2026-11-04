import { mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = { frame: number; accent: string };
/** The lid opens before the authored stock leaves the carrier. */
export function SessionCarrier({ frame, accent }: Readonly<Props>): ReactNode {
  return (
    <g>
      <path
        d="M35 195 V430 H245 V195"
        fill={STOCK.surface}
        stroke={STOCK.line}
        strokeWidth={3}
      />
      <path
        data-carrier-lid="opening"
        d={`M35 195 L${mix(ramp(frame, 16, 20), 245, 200)} ${mix(ramp(frame, 16, 20), 195, 155)}`}
        fill="none"
        stroke={accent}
        strokeWidth={4}
      />
    </g>
  );
}
