import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./SharedWorkshopBooking.schema";
import type { ReactNode } from "react";
type Props = { input: Input; accent: string };
/**
 * One physical productive asset stays present throughout every authored turn.
 */
export function SharedMachine({ input, accent }: Readonly<Props>): ReactNode {
  return (
    <g data-machine={input.machine.kind}>
      <path
        d="M100 418 H310 M120 418 V490 M290 418 V490"
        stroke={STOCK.muted}
        strokeWidth={5}
        fill="none"
      />
      {input.machine.kind === "sewing-machine" ? (
        <path
          d="M165 410 V350 H260 V375 H240 V405 M165 370 H220 M240 375 V409 M150 410 H270"
          stroke={accent}
          strokeWidth={5}
          fill="none"
        />
      ) : (
        <path
          d="M150 410 H270 M180 400 L220 365 M215 360 L237 382 M170 394 H260"
          stroke={accent}
          strokeWidth={5}
          fill="none"
        />
      )}
      <LabelSlots labels={[[input.machine.label, 48, 535, 280, 14, 3]]} />
    </g>
  );
}
