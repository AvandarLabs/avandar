import { isNullish } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { useFieldValueFormatter } from "@/components/caseFields/useFieldValueFormatter/useFieldValueFormatter";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { ReactNode } from "react";

type Props = {
  /** The field's `data_type`, which decides how its value reads. */
  dataType: AvaDataType.T;
  value: unknown;
};

/**
 * One field's value on the record page, read by the field's type, or a
 * dimmed "No value" when there is none (a NULL, or a record missing from the
 * view). Rendered by the record page's details rail.
 */
export function RecordFieldValue({
  dataType,
  value,
}: Readonly<Props>): ReactNode {
  const formatValue = useFieldValueFormatter(dataType);
  if (isNullish(value)) {
    return (
      <Text span c="dimmed">
        <Trans>No value</Trans>
      </Text>
    );
  }
  return formatValue(value);
}
