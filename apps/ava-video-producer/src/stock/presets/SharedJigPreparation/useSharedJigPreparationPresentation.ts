import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getJigSceneFromFrame } from "./getJigSceneFromFrame";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./SharedJigPreparation.schema";

/** Inputs for SharedJigPreparation. */
type Options = GraphicProps & { input: Input };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  frame: Options["frame"];
  input: Options["input"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scene: ReturnType<typeof getJigSceneFromFrame>;
  action: string;
};

/**
 * Returns jig scene state, action timing, and theme values for
 * `SharedJigPreparation`, `SharedJigStation`, `JigMakerLabel`.
 */
export function useSharedJigPreparationPresentation({
  frame,
  input,
  accent,
}: Readonly<Options>): Presentation {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scene = getJigSceneFromFrame({ motion, frame, input });
  const action =
    frame < 49
      ? input.labels.prepare
      : frame < 131
        ? input.labels.apply
        : input.labels.retained;
  return { frame, input, accent, tokens, scene, action };
}
