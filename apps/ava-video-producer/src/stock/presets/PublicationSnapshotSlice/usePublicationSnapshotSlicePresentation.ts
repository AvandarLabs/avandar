import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./PublicationSnapshotSlice.schema";

/** Complete source table, selected slice, revision and later live edit. */
export /** Values needed to derive this visual's layout and appearance. */
type Options = GraphicProps & { input: Input };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  frame: Options["frame"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/**
 * Returns publication input, frame, and theme values for
 * `PublishedSnapshotFrame`, `PublicationSnapshotSlice`.
 */
export function usePublicationSnapshotSlicePresentation({
  input,
  frame,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return { input, frame, accent, tokens, motion, scales };
}
