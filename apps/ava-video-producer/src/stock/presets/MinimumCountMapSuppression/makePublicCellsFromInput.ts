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
  return input.cells.map(({ id, label, count: numRecords }, index) => {
    const status =
      numRecords === null
        ? "missing"
        : numRecords === 0
          ? "zero"
          : numRecords < input.minimum
            ? "suppressed"
            : "released";
    return {
      id,
      label,
      index,
      status,
      value:
        numRecords !== null && (numRecords === 0 || numRecords >= input.minimum)
          ? numRecords
          : undefined,
    };
  });
}
