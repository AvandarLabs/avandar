import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./StatePreservingSourceRefresh.schema";

/** Frame-driven authored study props. */
export /** Values needed to derive this visual's layout and appearance. */
type Options = GraphicProps & { input: Input };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  frame: Options["frame"];
  input: Options["input"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  writes: number;
};

/**
 * Returns refresh write count and theme values for
 * `StatePreservingSourceRefresh`, `RefreshWriteCount`.
 */
export function useStatePreservingSourceRefreshPresentation({
  frame,
  input,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const writes = input.records.filter((record) => {
    return (
      input.sourceRows.find(({ id }) => {
        return id === record.id;
      })?.label !== record.label
    );
  }).length;
  return { frame, input, accent, tokens, scales, writes };
}
