import type { Input } from "./MinimumCountMapSuppression.schema";
type PublicCell = {
  id: string;
  label: string;
  index: number;
  status: "missing" | "zero" | "suppressed" | "released";
  value: number | undefined;
};
/** Sanitized public records never retain the local suppressed numeric value. */
export function makePublicCellsFromInput(input: Readonly<Input>): PublicCell[] {
  return input.cells.map(({ id, label, count }, index) => {
    const status =
      count === null
        ? "missing"
        : count === 0
          ? "zero"
          : count < input.minimum
            ? "suppressed"
            : "released";
    return {
      id,
      label,
      index,
      status,
      value:
        count !== null && (count === 0 || count >= input.minimum)
          ? count
          : undefined,
    };
  });
}
