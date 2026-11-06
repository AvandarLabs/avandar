import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { QueueHeadings } from "./QueueHeadings";
import { QueueServiceBay } from "./QueueServiceBay";
import type { Input } from "./QueueRelief.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** Closed bay outlines unfold before any waiting item can enter them. */
export function QueueStructure({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const expansion = ramp(frame, 54, 36);
  return (
    <g>
      <QueueHeadings frame={frame} input={input} />
      <rect
        x={36}
        y={154}
        width={248}
        height={414}
        rx={8}
        fill="none"
        stroke={STOCK.line}
      />
      <rect
        x={664}
        y={154}
        width={252}
        height={414}
        rx={8}
        fill="none"
        stroke={accent}
      />
      {input.serviceSlots.map((slot, index) => (
        <QueueServiceBay
          key={slot.id}
          slot={slot}
          index={index}
          expansion={expansion}
          accent={accent}
        />
      ))}
    </g>
  );
}
