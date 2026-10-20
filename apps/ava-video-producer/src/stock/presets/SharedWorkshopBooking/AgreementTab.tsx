import type { getBookingFromFrame } from "./getBookingFromFrame";
import type { ReactNode } from "react";
type Props = {
  scene: ReturnType<typeof getBookingFromFrame>;
  requestId: string;
  accent: string;
};
/** A non-null authored agreement gains a tab only as it reaches the booking. */
export function AgreementTab({
  scene,
  requestId,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {" "}
      {scene.hasBooking ? (
        <path
          data-agreement={requestId}
          d={`M${scene.x + scene.width - 25} ${scene.y + 20} l6 6 l11 -14`}
          stroke={accent}
          strokeWidth={3}
          fill="none"
          opacity={scene.vertical}
        />
      ) : undefined}
    </g>
  );
}
