import { Motion } from "../../../../motion";
import { StockRect } from "../../../primitives/StockRect";
import { DrillSubgroupCompartments } from "../DrillSubgroupCompartments";
import { DrillTiming } from "../DrillTiming";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../NestedDrilldownWindow.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  progress: number;
  groups: string[];
  accent: string;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  progress: Readonly<ParentProps>["progress"];
  groups: Readonly<ParentProps>["groups"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  x: number;
};

/** Renders the selected subgroup window in authored paint order. */
export function SelectedSubgroupWindow(options: Readonly<Props>): ReactNode {
  return (
    <>
      <DrillSubgroupCompartments
        groups={options.groups}
        progress={options.progress}
      />
      <StockRect
        x={Motion.mix({
          t: options.progress,
          from: options.x,
          to: 36,
        })}
        y={294}
        width={Motion.mix({
          t: options.progress,
          from: 284,
          to: 888,
        })}
        height={266}
        fill="none"
        stroke={options.accent}
        strokeWidth={options.scales.stroke(
          options.input.selectionStyle === "inset-frame"
            ? DrillTiming.INSET_STROKE
            : options.tokens.stroke.default,
        )}
      />
    </>
  );
}
