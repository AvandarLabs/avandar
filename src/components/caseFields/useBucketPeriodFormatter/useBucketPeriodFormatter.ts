import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { match } from "ts-pattern";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

const DAY_OPTIONS: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeZone: "UTC",
};
const MONTH_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
};
const YEAR_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  timeZone: "UTC",
};

/**
 * A function that labels a period by its first day (`YYYY-MM-DD`, as
 * `ConceptAttribute.toBucketedListEntries` returns it) for the given period
 * length, in the reader's locale: "Jan 5, 2026", "Week of Jan 5, 2026",
 * "Jan 2026", "Q1 2026", or "2026". Use it wherever a per-period value is
 * shown to a person, for example the record page's period table.
 */
export function useBucketPeriodFormatter(
  bucketGrain: ConceptAttribute.BucketGrain,
): (bucket: string) => string {
  const { t, i18n } = useLingui();
  return useMemo(() => {
    const dayFormat = new Intl.DateTimeFormat(i18n.locale, DAY_OPTIONS);
    const monthFormat = new Intl.DateTimeFormat(i18n.locale, MONTH_OPTIONS);
    const yearFormat = new Intl.DateTimeFormat(i18n.locale, YEAR_OPTIONS);
    return (bucket: string): string => {
      const firstDay = new Date(`${bucket}T00:00:00Z`);
      return match(bucketGrain)
        .with("day", () => {
          return dayFormat.format(firstDay);
        })
        .with("week", () => {
          const day = dayFormat.format(firstDay);
          return t`Week of ${day}`;
        })
        .with("month", () => {
          return monthFormat.format(firstDay);
        })
        .with("quarter", () => {
          const quarter = Math.floor(firstDay.getUTCMonth() / 3) + 1;
          const year = yearFormat.format(firstDay);
          return t`Q${quarter} ${year}`;
        })
        .with("year", () => {
          return yearFormat.format(firstDay);
        })
        .exhaustive();
    };
  }, [bucketGrain, i18n.locale, t]);
}
