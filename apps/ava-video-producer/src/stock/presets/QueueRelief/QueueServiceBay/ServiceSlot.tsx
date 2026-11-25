import { Motion } from "../../../../motion";
import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../QueueRelief.schema";
import type { ReactNode } from "react";

type ParentProps = {
  slot: Input["serviceSlots"][number];
  index: number;
  expansion: number;
  accent: string;
};

type Props = {
  slot: Readonly<ParentProps>["slot"];
  index: Readonly<ParentProps>["index"];
  expansion: Readonly<ParentProps>["expansion"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/** Renders the service slot in authored paint order. */
export function ServiceSlot(options: Readonly<Props>): ReactNode {
  return (
    <StockRect
      data-slot-id={options.slot.id}
      data-open={options.slot.initiallyOpen || options.expansion === 1}
      x={344}
      y={154 + options.index * 100}
      width={
        options.slot.initiallyOpen
          ? 272
          : Motion.mix({
              t: options.expansion,
              from: 48,
              to: 272,
            })
      }
      height={90}
      rx={options.scales.corner(6)}
      fill={options.tokens.color.surface}
      stroke={
        options.slot.initiallyOpen
          ? options.accent
          : options.tokens.color.highlight
      }
      strokeDasharray={
        options.slot.initiallyOpen || options.expansion === 1
          ? undefined
          : options.tokens.dash.placeholder.join(" ")
      }
    />
  );
}
