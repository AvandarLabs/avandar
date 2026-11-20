import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type RegisterEntryProps as Props } from "./RepairRegisterShared.types";
import type { ReactNode } from "react";
/** The follow-up's register entry: its port, number, owner, and due date. */
export function RegisterEntry({ issue, ordinal, x, accent }: Props): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <>
      <SketchedShape
        shape={{ kind: "circle", cx: x - 12, cy: 434, r: 3 }}
        profile={tokens.sketch.shape}
        data-register-port={issue.id}
        fill="none"
        stroke={accent}
      />
      <SketchedShape
        shape={{ kind: "path", d: `M${x} 434 h200` }}
        profile={tokens.sketch.shape}
        stroke={accent}
      />
      <text
        x={x - 12}
        y={452}
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontWeight={tokens.text.graphic.data.fontWeight}
        fontSize={tokens.text.graphic.data.fontSize}
        fill={tokens.text.graphic.data.color}
      >
        {ordinal}
      </text>
      <LabelSlots
        labels={[
          [issue.label, x, 452, 200, 12, 3],
          [issue.owner, x, 500, 200, 12, 3],
          [issue.dueLabel, x, 548, 200, 12, 3],
        ]}
      />
    </>
  );
}
