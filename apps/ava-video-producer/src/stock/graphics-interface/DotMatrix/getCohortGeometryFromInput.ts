import { prop } from "@avandar/utils";
import type { DotMatrixInput } from "../../presets/DotMatrix/DotMatrix.schema";

/** Supplies DotMatrix with frame-specific rendering geometry or progress. */
export function getCohortGeometryFromInput(input: Readonly<DotMatrixInput>): {
  selectedTotal: number;
  cohortTotal: number;
  dots: Array<{ x: number; y: number; selected: boolean }>;
} {
  const selectedTotal = input.groups
    .filter(prop("selected"))
    .reduce((total, group) => {
      return total + group.value;
    }, 0);
  const cohortTotal = input.groups.reduce((total, group) => {
    return total + group.value;
  }, 0);
  const dots = Array.from({ length: cohortTotal }, (_, index) => {
    return {
      x: 78 + (index % 20) * 30,
      y: 222 + Math.floor(index / 20) * 48,
      selected: index < selectedTotal,
    };
  });
  return { selectedTotal, cohortTotal, dots };
}
