import { FitText } from "../../primitives/FitText/FitText";
import { QuantityBand } from "../../primitives/QuantityBand/QuantityBand";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
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
    return (
      <FitText
        text={input.copy.areaUnit}
        x={32}
        y={467}
        width={896}
        fontSize={12}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
      />
    );
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
      <QuantityBand
        values={[
          { value: habitat, color: accent },
          { value: other, color: tokens.color.line },
        ]}
        denominator={input.landBoundaryHa}
        x={32}
        y={456}
        width={896}
        height={12}
      />
      <QuantityBand
        values={[
          { value: currentHabitat, color: accent },
          {
            value: input.landBoundaryHa - currentHabitat,
            color: tokens.color.line,
          },
        ]}
        denominator={input.landBoundaryHa}
        x={32}
        y={480}
        width={896}
        height={12}
      />
      {terms.map(({ label, value }, index) => {
        return (
          <g key={index}>
            <FitText
              text={label}
              x={32 + index * 310}
              y={512}
              width={276}
              fontSize={12}
              maxLines={3}
              breakLongWords
              normalizeWhitespace
            />
            <FitText
              text={value}
              x={32 + index * 310}
              y={555}
              width={276}
              fontSize={12}
              maxLines={2}
              breakLongWords
              normalizeWhitespace
            />
          </g>
        );
      })}
    </g>
  );
}
