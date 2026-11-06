import { propEq } from "@avandar/utils";
import type { Input } from "./ComponentMaterialReturn.schema";
/** Data for getMaterialBalanceFromInput. */
type GetMaterialBalanceResult = {
  returned: number;
  replacement: number;
  recycle: number;
  residue: number;
  assembled: number;
};

/**
 * Exact authored mass totals distinguish input, output and external streams.
 */
export function getMaterialBalanceFromInput(
  input: Readonly<Input>,
): GetMaterialBalanceResult {
  const returned = input.parts.reduce((sum, part) => sum + part.massKg, 0);
  const replacement = input.replacementInputs.reduce(
    (sum, part) => sum + part.massKg,
    0,
  );
  const recycle = input.parts
    .filter(propEq("route", "recycle"))
    .reduce((sum, part) => sum + part.massKg, 0);
  const residue = input.parts
    .filter(propEq("route", "residue"))
    .reduce((sum, part) => sum + part.massKg, 0);
  const assembled =
    input.parts
      .filter((part) => part.route === "reuse" || part.route === "repair")
      .reduce((sum, part) => sum + part.massKg, 0) + replacement;
  return { returned, replacement, recycle, residue, assembled };
}
