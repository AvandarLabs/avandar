import { useLingui } from "@lingui/react/macro";
import { Box, Group, Skeleton, Stack, Text, Title } from "@mantine/core";
import { useIntersection } from "@mantine/hooks";
import { Dataset } from "$/models/datasets/Dataset/Dataset";
import { useContext, useEffect, useRef, useState } from "react";
import { ActiveColumnContext } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/ActiveColumnContext";
import { ColumnSummaryBody } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/ColumnSummaryBody";
import { buildFullDataTypeLabel } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/datasetSummaryLabels";
import type { ReactNode } from "react";

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  // A single IntersectionObserver (against the viewport) drives two things for
  // this section: lazy-loading (render the SQL-backed body only once the section
  // scrolls near the viewport, with the 200px rootMargin prefetching just before
  // it appears) and scroll-spy (highlight this column in the outline once its top
  // reaches the viewport top; see the updateActiveColumn effect below).
  const { ref: intersectionRef, entry } = useIntersection({
    root: null,
    threshold: 0,
    rootMargin: "200px 0px 200px 0px",
  });
  const [hasIntersected, setHasIntersected] = useState(false);

  const setRefs = (element: HTMLDivElement | null): void => {
    containerRef.current = element;
    intersectionRef(element);
  };
  const isReadyToLoad = hasIntersected || entry?.isIntersecting === true;

  useEffect(
    function rememberFirstIntersection() {
      if (entry?.isIntersecting) {
        setHasIntersected(true);
      }
    },
    [entry?.isIntersecting],
  );

  useEffect(
    function updateActiveColumn() {
      if (entry?.isIntersecting && entry.boundingClientRect.top < 200) {
        setActiveColumn(columnName);
      }
    },
    [columnName, entry, setActiveColumn],
  );

  return (
    <Box
      ref={setRefs}
      id={`col-${encodeURIComponent(columnName)}`}
      style={{ scrollMarginTop: 24 }}
    >
      <Stack gap="sm">
        <Group gap="sm" align="baseline">
          <Title order={3} fw={650} style={{ letterSpacing: "-0.01em" }}>
            {columnName}
          </Title>
          <Text
            size="xs"
            c="dimmed"
            tt="uppercase"
            ff="monospace"
            style={{ letterSpacing: "0.04em" }}
          >
            {buildFullDataTypeLabel(dataType, i18n)}
          </Text>
        </Group>
        {isReadyToLoad ?
          <ColumnSummaryBody
            datasetId={datasetId}
            columnName={columnName}
            dataType={dataType}
            totalRows={totalRows}
          />
        : <Skeleton height={120} />}
      </Stack>
    </Box>
  );
}
