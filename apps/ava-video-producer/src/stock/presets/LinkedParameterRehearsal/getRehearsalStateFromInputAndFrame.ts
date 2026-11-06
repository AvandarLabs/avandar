import { EASE, ramp } from "../../../motion";
import { interpolateFiniteRange } from "../../numeric/interpolateFiniteRange/interpolateFiniteRange";
import type { Input } from "./LinkedParameterRehearsal.schema";
/**
 * The source advances to its authored trial and returns to the exact
 * baseline.
 */
export function getRehearsalStateFromInputAndFrame({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): {
  value: number;
  label: string;
} {
  const progress =
    frame <= 102
      ? ramp(frame, 36, 48, EASE.inOut)
      : 1 - ramp(frame, 102, 42, EASE.inOut);
  const value = interpolateFiniteRange({
    from: input.source.baseline,
    to: input.source.trial,
    progress,
  });
  const label =
    frame < 84
      ? input.phaseLabels.baseline
      : frame < 144
        ? input.phaseLabels.trial
        : input.phaseLabels.restored;
  return { value, label };
}
