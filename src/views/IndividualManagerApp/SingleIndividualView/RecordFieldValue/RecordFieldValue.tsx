import { isNullish } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { match } from "ts-pattern";
import { useFieldValueFormatter } from "@/components/caseFields/useFieldValueFormatter/useFieldValueFormatter";
import { RecordFieldValueList } from "@/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldValueList";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ReactNode } from "react";

type Props = {
  /** The field's name, which names its list of values. */
  fieldName: string;
  /** Whether the field keeps one value or every value. */
  valueShape: ConceptAttribute.ValueShape;
  /** The field's `data_type`: the type of its one value or of each item. */
  dataType: AvaDataType.T;
  value: unknown;
};

/** The items of a list value that hold a value, in order. */
function _getListItems(value: unknown): unknown[] {
  const items = Array.isArray(value) ? value : [value];
  return items.filter((item) => {
    return !isNullish(item);
  });
}

/**
 * One field's value on the record page, shaped by the field and read by its
 * type: one value as text, every value of a list field as a list, and a
 * dimmed "No value" when there is none (a NULL, a record missing from the
 * view, or a list with nothing in it). A NULL item inside a list is left
 * out, as the data grid leaves it out. Rendered by the record page's details
 * rail.
 */
export function RecordFieldValue({
  fieldName,
  valueShape,
  dataType,
  value,
}: Readonly<Props>): ReactNode {
  const formatValue = useFieldValueFormatter(dataType);
  const noValue = (
    <Text span c="dimmed">
      <Trans>No value</Trans>
    </Text>
  );
  if (isNullish(value)) {
    return noValue;
  }
  return match(valueShape)
    .with("single", () => {
      return formatValue(value);
    })
    .with("list", () => {
      const items = _getListItems(value);
      return items.length === 0 ? (
        noValue
      ) : (
        <RecordFieldValueList
          fieldName={fieldName}
          values={items}
          formatValue={formatValue}
        />
      );
    })
    .exhaustive();
}
