import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const request = input.requests[index];
  return (
    <g>
      {" "}
      {input.showOriginalRequests && scene.hasBooking ? (
        <StockRect
          data-original-request={request.id}
          x={scene.requestedX}
          y={scene.requestedY}
          width={scene.width}
          height={40}
          stroke={tokens.color.inactive}
          strokeDasharray={tokens.dash.pending.join(" ")}
          fill="none"
          opacity={tokens.alpha.dimmed}
        />
      ) : undefined}
    </g>
  );
}
