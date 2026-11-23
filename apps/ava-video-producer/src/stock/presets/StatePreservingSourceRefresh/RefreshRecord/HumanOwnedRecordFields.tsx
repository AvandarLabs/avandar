import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../StatePreservingSourceRefresh.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  record: Input["records"][number];
  index: number;
  frame: number;
  accent: string;
};

type Props = {
  record: Readonly<ParentProps>["record"];
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  y: number;
};

/** Renders the human owned record fields in authored paint order. */
export function HumanOwnedRecordFields(options: Readonly<Props>): ReactNode {
  return (
    <>
      <StockRect
        data-human-pin={options.record.id}
        x={610}
        y={options.y + 5}
        width={290}
        height={88}
        rx={options.scales.corner(options.tokens.corner.chip)}
        fill={options.tokens.color.elevated}
        stroke={options.accent}
        strokeOpacity={options.motion.ramp(
          options.frame,
          13,
          options.motion.scale(37),
        )}
      />
      <LabelSlots
        labels={[
          [options.record.status, 625, options.y + 19, 125, 12, 5],
          [options.record.assignee, 765, options.y + 19, 125, 12, 5],
        ]}
      />
      <SketchedShape
        shape={{ kind: "path", d: `M598 ${options.y + 5} V${options.y + 93}` }}
        profile={options.tokens.sketch.shape}
        fill="none"
        stroke={options.accent}
        strokeWidth={options.scales.stroke(options.tokens.stroke.default)}
      />
    </>
  );
}
