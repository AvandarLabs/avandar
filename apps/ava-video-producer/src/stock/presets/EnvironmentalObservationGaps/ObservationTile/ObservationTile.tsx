import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { makeObservationLayoutFromInput } from "../makeObservationLayoutFromInput";
import { ObservationTileContent } from "./ObservationTileContent";
import type { Input } from "../EnvironmentalObservationGaps.schema";
import type { ReactNode } from "react";

/** Inputs for ObservationTile. */
type Props = {
  frame: number;
  accent: string;
  id: string;
  input: Input;
};

/**
 * A lifting cloud sheet reveals readings without replacing the missing cells.
 */
export function ObservationTile({
  frame,
  accent,
  id,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { cells, checks } = makeObservationLayoutFromInput(input);
  const lift = motion.ramp(frame, 36, motion.scale(20), motion.travel.easing),
    unfold = motion.ramp(frame, 16, motion.hero, motion.travel.easing);
  const patternId = `${id}-missing-hatch`;
  return (
    <ObservationTileContent
      frame={frame}
      accent={accent}
      input={input}
      tokens={tokens}
      scales={scales}
      cells={cells}
      checks={checks}
      lift={lift}
      unfold={unfold}
      patternId={patternId}
    />
  );
}
