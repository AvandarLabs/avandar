import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { createFieldValueFormatter } from "@/components/caseFields/createFieldValueFormatter/createFieldValueFormatter";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";

/**
 * A function that reads one value of a case type field as text in the
 * active locale, by the field's `data_type`, with a yes or no in words. Use
 * it wherever a component shows a field's value, for example on the record
 * page. Rules live in `createFieldValueFormatter`.
 */
export function useFieldValueFormatter(
  dataType: AvaDataType.T,
): (value: unknown) => string {
  const { t, i18n } = useLingui();
  const yesLabel = t`Yes`;
  const noLabel = t`No`;
  return useMemo(() => {
    return createFieldValueFormatter({
      dataType,
      locale: i18n.locale,
      booleanLabels: { yes: yesLabel, no: noLabel },
    });
  }, [dataType, i18n.locale, yesLabel, noLabel]);
}
