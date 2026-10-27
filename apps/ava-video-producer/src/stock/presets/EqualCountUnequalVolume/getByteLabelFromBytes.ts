import { matchLiteral } from "@avandar/utils";
import type { Input } from "./EqualCountUnequalVolume.schema";
/**
 * Fixed decimal display conversion leaves the exact byte geometry untouched.
 */
export function getByteLabelFromBytes({
  bytes,
  displayUnit,
}: Readonly<{
  bytes: number;
  displayUnit: Input["measure"]["displayUnit"];
}>): string {
  const divisor = matchLiteral(displayUnit, { B: 1, KiB: 1024, MiB: 1048576 });
  return `${(bytes / divisor).toFixed(displayUnit === "B" ? 0 : 2)} ${displayUnit}`;
}
