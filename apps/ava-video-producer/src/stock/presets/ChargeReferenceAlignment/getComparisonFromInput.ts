import { CONTEXT_FIELDS } from "./CONTEXT_FIELDS.constants";
import type { Input } from "./ChargeReferenceAlignment.schema";
/** Data for getComparisonFromInput. */
type GetComparisonFromInputResult = {
  isMatched: boolean;
  billed: number;
  reference: number;
  domain: number;
  difference: number | undefined;
};

/** Exact context eligibility and integer minor-unit arithmetic. */
export function getComparisonFromInput(
  input: Readonly<Input>,
): GetComparisonFromInputResult {
  const isMatched = CONTEXT_FIELDS.every(
    ([key]) => input.invoice[key] === input.reference[key],
  );
  const billed = input.invoice.quantity * input.invoice.unitPriceMinor;
  const reference = input.reference.quantity * input.reference.unitPriceMinor;
  return {
    isMatched,
    billed,
    reference,
    domain: Math.max(1, billed, reference),
    difference: isMatched ? billed - reference : undefined,
  };
}
