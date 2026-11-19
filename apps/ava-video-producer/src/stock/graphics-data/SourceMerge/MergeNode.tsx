import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Arrive } from "../../graphics-common/Arrive";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicProps,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { MERGE, MERGE_GLYPH } from "./SourceMerge.constants";
import type { ReactNode } from "react";

type Props = Readonly<{ frame: number; accent: string }>;

/** The node where every source edge meets, with its glyph and label. */
export function MergeNode({ frame, accent }: Props): ReactNode {
  const style = useGraphicProps("SourceMerge", {});
  const { color, sketch } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  return (
    <Arrive frame={frame} at={24}>
      <SketchedShape
        shape={{
          kind: "circle",
          cx: MERGE.x,
          cy: MERGE.y,
          r: style.mergeRadius,
        }}
        profile={sketch.shape}
        fill={color.surface}
        stroke={accent}
        strokeOpacity={style.mergeStrokeAlpha}
        strokeWidth={shapes.stroke(style.mergeStrokeWidth)}
      />
      <SketchedShape
        shape={{ kind: "path", d: MERGE_GLYPH }}
        profile={sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={shapes.stroke(style.glyphWidth)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Text role="note" x={MERGE.x} y={394} anchor="middle">
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["source-merge"].merge,
        })}
      </Text>
    </Arrive>
  );
}
