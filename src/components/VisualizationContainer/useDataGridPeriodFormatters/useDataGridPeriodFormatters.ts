import { useMemo } from "react";
import { useBucketPeriodFormatter } from "@/components/caseFields/useBucketPeriodFormatter/useBucketPeriodFormatter";
import { useBucketValueFormatter } from "@/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldPeriodTable/useBucketValueFormatter";
import type { DataGridPeriodFormatters } from "@/lib/ui/viz/makeDataGridColumnDefs/makeDataGridColumnDefs";

/**
 * The formatters a results grid reads a per-period cell with: each period
 * labeled for its length in the reader's locale, and each value as the record
 * page's period table shows it (numbers to at most two decimals). A period of
 * an unknown length, such as one in a raw SQL result, shows as its first day.
 * The grid cannot know a value's type, so a value reads as a number when it
 * is one and as plain text otherwise.
 */
export function useDataGridPeriodFormatters(): DataGridPeriodFormatters {
  // One formatter per period length: a hook cannot be called for a length
  // that is only known when the grid renders.
  const formatDay = useBucketPeriodFormatter("day");
  const formatWeek = useBucketPeriodFormatter("week");
  const formatMonth = useBucketPeriodFormatter("month");
  const formatQuarter = useBucketPeriodFormatter("quarter");
  const formatYear = useBucketPeriodFormatter("year");
  const formatValue = useBucketValueFormatter("double");
  return useMemo(() => {
    const periodFormatters = {
      day: formatDay,
      week: formatWeek,
      month: formatMonth,
      quarter: formatQuarter,
      year: formatYear,
    };
    return {
      formatPeriod: (bucket, bucketGrain) => {
        return bucketGrain === undefined
          ? bucket
          : periodFormatters[bucketGrain](bucket);
      },
      formatValue,
    };
  }, [
    formatDay,
    formatWeek,
    formatMonth,
    formatQuarter,
    formatYear,
    formatValue,
  ]);
}
