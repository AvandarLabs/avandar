import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Arrive } from "../../graphics-common/Arrive";
import { Text } from "../../graphics-common/Text";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import {
  useGraphicProps,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { MERGE, MERGE_GLYPH } from "./SourceMerge.constants";

type Props = Readonly<{ frame: number; accent: string }>;

/** The node where every source edge meets, with its glyph and label. */
export function MergeNode({ frame, accent }: Props) {
  const style = useGraphicProps("SourceMerge", {});
  const { color } = useGraphicTokens();
  return (
    <Arrive frame={frame} at={24}>
      <circle
        cx={MERGE.x}
        cy={MERGE.y}
        r={style.mergeRadius}
        fill={color.surface}
        stroke={accent}
        strokeOpacity={style.mergeStrokeAlpha}
        strokeWidth={style.mergeStrokeWidth}
      />
      <path
        d={MERGE_GLYPH}
        fill="none"
        stroke={accent}
        strokeWidth={style.glyphWidth}
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
