import { Trans } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { useId, useState } from "react";
import { buildPeriodShowAllLabel } from "@/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldPeriodTable/buildPeriodShowAllLabel";
import { PeriodTable } from "@/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldPeriodTable/PeriodTable";
import { PeriodTableToggle } from "@/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldPeriodTable/PeriodTableToggle";
import { usePeriodTableCaption } from "@/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldPeriodTable/usePeriodTableCaption";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ReactNode } from "react";

/**
 * How many periods the rail shows before offering the rest. Six months is
 * half a year, and six rows stay shorter than the facts around them.
 */
const RECENT_PERIOD_COUNT = 6;

type Props = {
  /** The field's name, for the table's accessible name. */
  fieldName: string;
  bucketGrain: ConceptAttribute.BucketGrain;
  /** The field's `data_type`: the type of each period's value. */
  valueDataType: AvaDataType.T;
  /** The periods, oldest first, as the concept view orders them. */
  entries: readonly ConceptAttribute.BucketedListEntry[];
};

/**
 * A per-period field's value on the record page: its most recent periods as
 * a table, and a toggle that opens every period in place. Shows a dimmed "No
 * value" when the field has no periods. Rendered by `RecordFieldValue`.
 */
export function RecordFieldPeriodTable({
  fieldName,
  bucketGrain,
  valueDataType,
  entries,
}: Readonly<Props>): ReactNode {
  const tableId = useId();
  const [isExpanded, setIsExpanded] = useState(false);
  const caption = usePeriodTableCaption(fieldName, bucketGrain);
  const showAllLabel = buildPeriodShowAllLabel(bucketGrain, entries.length);
  if (entries.length === 0) {
    return (
      <Text span c="dimmed">
        <Trans>No value</Trans>
      </Text>
    );
  }
  const isCollapsible = entries.length > RECENT_PERIOD_COUNT;
  const shownEntries =
    isCollapsible && !isExpanded
      ? entries.slice(-RECENT_PERIOD_COUNT)
      : entries;
  return (
    <>
      <PeriodTable
        id={tableId}
        caption={caption}
        bucketGrain={bucketGrain}
        valueDataType={valueDataType}
        entries={shownEntries}
      />
      {isCollapsible ? (
        <PeriodTableToggle
          tableId={tableId}
          isExpanded={isExpanded}
          showAllLabel={showAllLabel}
          onToggle={() => {
            setIsExpanded(!isExpanded);
          }}
        />
      ) : null}
    </>
  );
}
