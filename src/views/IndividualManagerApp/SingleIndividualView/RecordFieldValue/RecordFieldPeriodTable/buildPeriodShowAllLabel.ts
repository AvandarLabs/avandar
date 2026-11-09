import { plural } from "@lingui/core/macro";
import { match } from "ts-pattern";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

/** The toggle label that opens every period, such as "Show all 8 months". */
export function buildPeriodShowAllLabel(
  bucketGrain: ConceptAttribute.BucketGrain,
  periodCount: number,
): string {
  return match(bucketGrain)
    .with("day", () => {
      return plural(periodCount, {
        one: "Show all # day",
        other: "Show all # days",
      });
    })
    .with("week", () => {
      return plural(periodCount, {
        one: "Show all # week",
        other: "Show all # weeks",
      });
    })
    .with("month", () => {
      return plural(periodCount, {
        one: "Show all # month",
        other: "Show all # months",
      });
    })
    .with("quarter", () => {
      return plural(periodCount, {
        one: "Show all # quarter",
        other: "Show all # quarters",
      });
    })
    .with("year", () => {
      return plural(periodCount, {
        one: "Show all # year",
        other: "Show all # years",
      });
    })
    .exhaustive();
}
