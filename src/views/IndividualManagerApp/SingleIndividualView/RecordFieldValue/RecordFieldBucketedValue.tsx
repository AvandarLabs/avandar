import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import { useFieldValueFormatter } from "@/components/caseFields/useFieldValueFormatter/useFieldValueFormatter";
import { RecordFieldPeriodTable } from "@/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldPeriodTable/RecordFieldPeriodTable";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { ReactNode } from "react";

type Props = {
  /** The field's name, for the table's accessible name. */
  fieldName: string;
  /** The field's period, or `undefined` when the field is inconsistent. */
  bucketGrain: ConceptAttribute.BucketGrain | undefined;
  /** The field's `data_type`: the type of each period's value. */
  dataType: AvaDataType.T;
  value: unknown;
};

/**
 * A per-period field's value on the record page: its periods as a table.
 * A value that is not a list of periods, or a field with no period, is a
 * broken value, so it shows as text rather than failing the page. Rendered
 * by `RecordFieldValue`.
 */
export function RecordFieldBucketedValue({
  fieldName,
  bucketGrain,
  dataType,
  value,
}: Readonly<Props>): ReactNode {
  const formatValue = useFieldValueFormatter(dataType);
  const entries = ConceptAttribute.toBucketedListEntries(value);
  if (!entries || bucketGrain === undefined) {
    return formatValue(value);
  }
  return (
    <RecordFieldPeriodTable
      fieldName={fieldName}
      bucketGrain={bucketGrain}
      valueDataType={dataType}
      entries={entries}
    />
  );
}
