import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { getByteLabelFromBytes } from "./getByteLabelFromBytes";
import type { Input } from "./EqualCountUnequalVolume.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  group: Input["groups"][number];
  y: number;
  accent: string;
};
/** Identical byte ruler and optional persistent count guide. */
export function VolumeScale({
  input,
  group,
  y,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
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
        <g data-count-guide={group.id}>
          <SketchedShape
            shape={{
              kind: "path",
              d: `M420 ${y + 45} v${group.items.length * 39}`,
            }}
            profile={tokens.sketch.shape}
            stroke={accent}
            strokeDasharray={tokens.dash.guide.join(" ")}
          />
        </g>
      ) : null}
    </g>
  );
}
