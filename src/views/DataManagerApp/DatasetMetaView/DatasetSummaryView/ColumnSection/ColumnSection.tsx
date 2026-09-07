import { useLingui } from "@lingui/react/macro";
import { Group, Skeleton, Stack, Text } from "@mantine/core";
import { useIntersection } from "@mantine/hooks";
import { useContext, useEffect, useState } from "react";
import { Dataset } from "$/models/datasets/Dataset/Dataset";
import { ActiveColumnContext } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/ActiveColumnContext";
import { makeColumnSectionIdFromColumnName } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/makeColumnSectionIdFromColumnName";
import css from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/ColumnSection/ColumnSection.module.css";
import { ColumnSummaryBody } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/ColumnSummaryBody/ColumnSummaryBody";
import { buildFullDataTypeLabel } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/datasetSummaryLabels";
import type { ReactNode } from "react";

/** How far ahead of the viewport a section's summary query is started. */
const LAZY_LOAD_ROOT_MARGIN = "200px 0px 200px 0px";

/**
 * Collapses the observer root to a band just below the view's header band
 * and tab strip. A section overlapping it is the one the reader is on.
 */
const READING_LINE_ROOT_MARGIN = "-200px 0px -70% 0px";

type Props = {
  datasetId: Dataset.Id;
  columnName: string;
  dataType: string;
  totalRows: number;
};

/** Lazily loads one column summary and updates the active outline entry. */
export function ColumnSection({
  datasetId,
  columnName,
  dataType,
  totalRows,
}: Props): ReactNode {
  const { i18n } = useLingui();
  const setActiveColumn = useContext(ActiveColumnContext);

  // Lazy-loading: render the SQL-backed body only once the section comes
  // near the viewport, with the 200px margin prefetching just before it
  // arrives.
  const { ref: loadTriggerRef, entry: loadEntry } = useIntersection({
    root: null,
    threshold: 0,
    rootMargin: LAZY_LOAD_ROOT_MARGIN,
  });

  // Scroll-spy: a second observer whose root is squeezed to a thin band just
  // under the view's header, so "is this section intersecting" answers "is
  // this the column being read" directly. Testing a rect against a
  // coordinate on the lazy-load observer cannot: that entry only updates
  // when the section crosses the prefetch boundary, which is hundreds of
  // pixels from where the reader's eye is.
  const { ref: readingLineRef, entry: readingLineEntry } = useIntersection({
    root: null,
    threshold: 0,
    rootMargin: READING_LINE_ROOT_MARGIN,
  });

  const [hasIntersected, setHasIntersected] = useState(false);

  const setRefs = (element: HTMLDivElement | null): void => {
    loadTriggerRef(element);
    readingLineRef(element);
  };
  const isReadyToLoad = hasIntersected || loadEntry?.isIntersecting === true;

  useEffect(
    function rememberFirstIntersection() {
      if (loadEntry?.isIntersecting) {
        setHasIntersected(true);
      }
    },
    [loadEntry?.isIntersecting],
  );

  useEffect(
    function updateActiveColumn() {
      if (readingLineEntry?.isIntersecting) {
        setActiveColumn(columnName);
      }
    },
    [columnName, readingLineEntry?.isIntersecting, setActiveColumn],
  );

  return (
    <section
      ref={setRefs}
      id={makeColumnSectionIdFromColumnName(columnName)}
      className={css.columnSection}
    >
      <Stack gap="sm">
        <Group gap="sm" align="baseline" wrap="nowrap">
          <Text component="h4" className={css.columnSectionName}>
            {columnName}
          </Text>
          <Text className={css.columnSectionType}>
            {buildFullDataTypeLabel(dataType, i18n)}
          </Text>
        </Group>
        {isReadyToLoad ? (
          <ColumnSummaryBody
            datasetId={datasetId}
            columnName={columnName}
            dataType={dataType}
            totalRows={totalRows}
          />
        ) : (
          <Skeleton height={72} radius="sm" />
        )}
      </Stack>
    </section>
  );
}
