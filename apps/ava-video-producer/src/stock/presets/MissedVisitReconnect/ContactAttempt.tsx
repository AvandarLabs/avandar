import { ramp } from "../../../motion";
import type { Input } from "./MissedVisitReconnect.schema";
import type { ReactNode } from "react";
type Props = {
  item: Input["cases"][number];
  index: number;
  y: number;
  frame: number;
  accent: string;
};
/**
 * Phone and doorstep attempts show authored channels without implying return.
 */
export function ContactAttempt({
  item,
  index,
  y,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const contact = ramp(frame, 39 + index * 9, 8);
  return (
    <g data-channel={item.channel} opacity={contact}>
      <path
        d={
          item.channel === "phone"
            ? `M310 ${y - 10} q-14 9 0 20 l6 -5 -5 -4 -3 3 q-5 -4 -3 -8 l4 1 3 -4 Z`
            : `M295 ${y + 12} v-25 h20 v25 M311 ${y} h1`
        }
        stroke={accent}
        fill="none"
      />
      <path
        d={`M325 ${y} H337`}
        stroke={accent}
        strokeDasharray={item.outcome === "unreached" ? "2 3" : undefined}
      />
    </g>
  );
}
