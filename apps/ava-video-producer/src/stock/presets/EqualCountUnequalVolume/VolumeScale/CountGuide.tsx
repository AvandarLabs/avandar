import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props as VolumeScaleSharedProps } from "./VolumeScaleShared.types";
import type { ReactNode } from "react";

type Props = Omit<VolumeScaleSharedProps, "input">;

/** A guide beside the group as long as its count of items. */
export function CountGuide({ group, y, accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
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
  );
}
