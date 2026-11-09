import { useLingui } from "@lingui/react/macro";
import { match } from "ts-pattern";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

/**
 * The name of a field's period table for assistive technology, such as
 * "Temperature per month". The record page's rail label already names the
 * field on screen, so the table keeps this name off screen.
 */
export function usePeriodTableCaption(
  fieldName: string,
  bucketGrain: ConceptAttribute.BucketGrain,
): string {
  const { t } = useLingui();
  return match(bucketGrain)
    .with("day", () => {
      return t`${fieldName} per day`;
    })
    .with("week", () => {
      return t`${fieldName} per week`;
    })
    .with("month", () => {
      return t`${fieldName} per month`;
    })
    .with("quarter", () => {
      return t`${fieldName} per quarter`;
    })
    .with("year", () => {
      return t`${fieldName} per year`;
    })
    .exhaustive();
}
