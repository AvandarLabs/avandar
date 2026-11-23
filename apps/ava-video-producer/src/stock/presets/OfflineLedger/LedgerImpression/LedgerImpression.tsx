import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { LedgerImpressionLocalImpression } from "./LedgerImpressionLocalImpression";
import type { ReactNode } from "react";

type Props = {
  entryId: string;
  index: number;
  frame: number;
  accent: string;
  isVisible: boolean;
};

/** The cue the first impression presses into storage on. */
const FIRST_IMPRESSION_CUE = 44;

/** Frames between impressions, matching the writing cadence. */
const CADENCE_FRAMES = 16;

/**
 * A shallow engraved impression remains after its matching entry is written.
 */
export function LedgerImpression({
  entryId,
  index,
  frame,
  accent,
  isVisible,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const pressAt = FIRST_IMPRESSION_CUE + index * CADENCE_FRAMES;
  const impression = Motion.ramp({
    frame,
    at: pressAt,
    dur: motion.chip,
    easing: motion.entrance.easing,
  });
  if (!isVisible || frame < pressAt) {
    return undefined;
  }
  return (
    <LedgerImpressionLocalImpression
      entryId={entryId}
      index={index}
      accent={accent}
      atomic={atomic}
      tokens={tokens}
      scales={scales}
      impression={impression}
    />
  );
}
