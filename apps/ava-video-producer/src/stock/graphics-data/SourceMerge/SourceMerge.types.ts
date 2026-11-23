import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { SourceMergeInput } from "../../presets/SourceMerge/SourceMerge.schema";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";

/** Rendering data shared within SourceMerge. */
export type Props = GraphicProps & {
  input: SourceMergeInput;
};
/** Rendering data shared within SourceMerge. */
export type SourceMergeHeadingData = {
  input: Props["input"];
  frame: Props["frame"];
  accent: Props["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};
