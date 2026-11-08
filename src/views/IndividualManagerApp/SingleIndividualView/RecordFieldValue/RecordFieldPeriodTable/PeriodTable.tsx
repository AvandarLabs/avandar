import { Trans } from "@lingui/react/macro";
import { useBucketGrainLabels } from "@/components/caseFields/useBucketGrainLabels/useBucketGrainLabels";
import { useBucketPeriodFormatter } from "@/components/caseFields/useBucketPeriodFormatter/useBucketPeriodFormatter";
import css from "@/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldPeriodTable/RecordFieldPeriodTable.module.css";
import { useBucketValueFormatter } from "@/views/IndividualManagerApp/SingleIndividualView/RecordFieldValue/RecordFieldPeriodTable/useBucketValueFormatter";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ReactNode } from "react";

type Props = {
  /** Ties the table to the toggle that shows more of it. */
  id: string;
  /** The table's name for assistive technology. */
  caption: string;
  bucketGrain: ConceptAttribute.BucketGrain;
  valueDataType: AvaDataType.T;
  /** The periods to list, oldest first. */
  entries: readonly ConceptAttribute.BucketedListEntry[];
};

/**
 * One row per period: the period as the row's header, then its value. The
 * period is a row header so a screen reader announces it with each value.
 */
export function PeriodTable({
  id,
  caption,
  bucketGrain,
  valueDataType,
  entries,
}: Readonly<Props>): ReactNode {
  const formatPeriod = useBucketPeriodFormatter(bucketGrain);
  const formatValue = useBucketValueFormatter(valueDataType);
  const periodHeading = useBucketGrainLabels()[bucketGrain].period;
  return (
    <table id={id} className={css.table}>
      <caption className={css.caption}>{caption}</caption>
      <thead>
        <tr>
          <th scope="col" className={css.periodHeading}>
            {periodHeading}
          </th>
          <th scope="col" className={css.valueHeading}>
            <Trans>Value</Trans>
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => {
          return (
            <tr key={entry.bucket}>
              <th scope="row" className={css.period}>
                {formatPeriod(entry.bucket)}
              </th>
              <td className={css.value}>{formatValue(entry.value)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
