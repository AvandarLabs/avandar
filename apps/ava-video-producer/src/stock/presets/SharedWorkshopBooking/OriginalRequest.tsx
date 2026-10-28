import { STOCK } from "../../stockPalette";
import type { getBookingFromFrame } from "./getBookingFromFrame";
import type { Input } from "./SharedWorkshopBooking.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  scene: ReturnType<typeof getBookingFromFrame>;
  index: number;
};
/** A dotted prior request never creates a second person or use turn. */
export function OriginalRequest({
  input,
  scene,
  index,
}: Readonly<Props>): ReactNode {
  const request = input.requests[index];
  return (
    <g>
      {" "}
      {input.showOriginalRequests && scene.hasBooking ? (
        <rect
          data-original-request={request.id}
          x={scene.requestedX}
          y={scene.requestedY}
          width={scene.width}
          height={40}
          stroke={STOCK.muted}
          strokeDasharray="4 4"
          fill="none"
          opacity={0.4}
        />
      ) : undefined}
    </g>
  );
}
