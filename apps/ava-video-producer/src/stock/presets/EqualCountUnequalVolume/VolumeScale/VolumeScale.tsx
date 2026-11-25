import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getByteLabelFromBytes } from "../getByteLabelFromBytes";
import { CountGuide } from "./CountGuide";
import { type Props } from "./VolumeScaleShared.types";
import type { ReactNode } from "react";
/** Identical byte ruler and optional persistent count guide. */
export function VolumeScale({
  input,
  group,
  y,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g>
      <SketchedShape
        shape={{ kind: "path", d: `M440 ${y + 27} V${y + 160} H900` }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        fill="none"
      />
      <LabelSlots
        labels={[
          [`0 ${input.measure.displayUnit}`, 440, y + 19, 120, 12, 1],
          [
            getByteLabelFromBytes({
              bytes: input.measure.scaleMaximumBytes,
              displayUnit: input.measure.displayUnit,
            }),
            790,
            y + 19,
            110,
            12,
            1,
          ],
        ]}
      />
      {input.showCountGuides ? (
        <CountGuide group={group} y={y} accent={accent} />
      ) : null}
    </g>
  );
}
