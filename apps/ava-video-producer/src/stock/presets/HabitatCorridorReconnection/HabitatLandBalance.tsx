import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { HabitatCurrentLandBand } from "./HabitatCurrentLandBand/HabitatCurrentLandBand";
import { HabitatLandBalanceAreaUnitLabel } from "./HabitatLandBalanceAreaUnitLabel/HabitatLandBalanceAreaUnitLabel";
import { HabitatLandBalanceTerms } from "./HabitatLandBalanceTerms/HabitatLandBalanceTerms";
import { HabitatOriginalLandBand } from "./HabitatOriginalLandBand/HabitatOriginalLandBand";
import type { Input } from "./HabitatCorridorReconnection.schema";
import type { ReactNode } from "react";

/** Inputs for HabitatLandBalance. */
type Props = { frame: number; accent: string; input: Input };
/**
 * The corridor reclassifies existing other land inside the unchanged
 * denominator.
 */
export function HabitatLandBalance({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const habitat = input.patches.reduce((total, patch) => {
      return total + patch.areaHa;
    }, 0),
    corridor = (input.corridor.lengthM * input.corridor.widthM) / 10000;
  const other = input.landBoundaryHa - habitat,
    afterHabitat = habitat + corridor,
    afterOther = input.landBoundaryHa - afterHabitat;
  const progress = motion.ramp(
      frame,
      36,
      motion.scale(42),
      motion.travel.easing,
    ),
    currentHabitat = habitat + corridor * progress;
  if (!input.showLandBalance) {
    return <HabitatLandBalanceAreaUnitLabel input={input} />;
  }
  const terms = [
    { label: input.copy.habitat, value: `${habitat} → ${afterHabitat}` },
    { label: input.copy.otherLand, value: `${other} → ${afterOther}` },
    { label: input.copy.areaUnit, value: String(input.landBoundaryHa) },
  ];
  return (
    <g
      data-land-balance="true"
      data-habitat-before={habitat}
      data-habitat-after={afterHabitat}
      data-other-after={afterOther}
    >
      <HabitatOriginalLandBand {...{ habitat, accent, other, tokens, input }} />
      <HabitatCurrentLandBand {...{ currentHabitat, accent, input, tokens }} />
      <HabitatLandBalanceTerms terms={terms} />
    </g>
  );
}
