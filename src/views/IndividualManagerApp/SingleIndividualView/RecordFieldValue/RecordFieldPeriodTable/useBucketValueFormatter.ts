import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import { useFieldValueFormatter } from "@/components/caseFields/useFieldValueFormatter/useFieldValueFormatter";

const NUMBER_OPTIONS: Intl.NumberFormatOptions = { maximumFractionDigits: 2 };

/**
 * A function that formats one period's value for `RecordFieldPeriodTable`,
 * by the field's data type. Every type reads as it does elsewhere on the
 * record page, except that numbers keep at most two fraction digits: a
 * period's value is usually an average, and a long tail of digits makes the
 * column hard to scan.
 */
export function useBucketValueFormatter(
  valueDataType: AvaDataType.T,
): (value: unknown) => string {
  const { i18n } = useLingui();
  const formatFieldValue = useFieldValueFormatter(valueDataType);
  return useMemo(() => {
    if (!AvaDataType.isNumeric(valueDataType)) {
      return formatFieldValue;
    }
    const numberFormat = new Intl.NumberFormat(i18n.locale, NUMBER_OPTIONS);
    return (value: unknown): string => {
      return typeof value === "number"
        ? numberFormat.format(value)
        : formatFieldValue(value);
    };
  }, [formatFieldValue, i18n.locale, valueDataType]);
}
