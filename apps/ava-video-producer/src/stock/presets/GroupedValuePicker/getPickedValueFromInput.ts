import { prop } from "@avandar/utils";
import { match } from "ts-pattern";
import type { Input } from "./GroupedValuePicker.schema";
/**
 * Exact deterministic field result, retaining null and unrounded arithmetic.
 */
export function getPickedValueFromInput(input: Readonly<Input>): number | null {
  const values = input.observations.map(prop("value"));
  const numeric = values.filter((value): value is number => value !== null);
  const sum = numeric.reduce((total, value) => total + value, 0);
  return match(input)
    .with({ rule: "first" }, () => {
      return values[0];
    })
    .with({ rule: "sum" }, () => {
      return sum;
    })
    .with({ rule: "mean" }, () => {
      return sum / numeric.length;
    })
    .with({ rule: "min" }, () => {
      return Math.min(...numeric);
    })
    .with({ rule: "max" }, () => {
      return Math.max(...numeric);
    })
    .with({ rule: "count" }, () => {
      return numeric.length;
    })
    .with({ rule: "most-frequent" }, (matchedInput) => {
      const candidates = [
        ...new Set(
          matchedInput.nullPolicy === "include-in-mode" ? values : numeric,
        ),
      ];
      return candidates.sort((first, second) => {
        const countDifference =
          values.filter((value) => value === second).length -
          values.filter((value) => value === first).length;
        return (
          countDifference ||
          (first === null ? 1 : second === null ? -1 : first - second)
        );
      })[0];
    })
    .exhaustive();
}
