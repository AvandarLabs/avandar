import { FitText } from "../../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ServiceSlot } from "./ServiceSlot";
import type { Input } from "../QueueRelief.schema";
import type { ReactNode } from "react";

type Props = {
  slot: Input["serviceSlots"][number];
  index: number;
  expansion: number;
  accent: string;
};

/** A named closed outline expands to full usable service capacity. */
export function QueueServiceBay({
  slot,
  index,
  expansion,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <ServiceSlot
        slot={slot}
        index={index}
        expansion={expansion}
        accent={accent}
        tokens={tokens}
        scales={scales}
      />
      <FitText
        text={slot.label}
        x={356}
        y={174 + index * 100}
        width={248}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
