import { Trans, useLingui } from "@lingui/react/macro";
import {
  Anchor,
  Box,
  Group,
  RingProgress,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useIntersection } from "@mantine/hooks";
import { IconChevronRight, IconHash } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { ColumnSummaryBody } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/ColumnSummaryBody";
import css from "./DatasetSummaryView.module.css";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

type Props = {
  datasetId: DatasetId;
};

/**
 * Redesigned dataset summary. Replaces the long `ObjectDescriptionList` with
 * a doc-style outline:
 *
 *   - Sticky table-of-contents on the left, highlighting the column you're
 *     reading.
 *   - One section per column. Each section leads with a one-sentence
 *     plain-language summary, then surfaces a type-appropriate
 *     visualisation (most-common value, min/avg/max range, date timeline).
 *   - Each section is lazy: its per-column query only fires when the
 *     section scrolls into view. This keeps wide datasets (50+ columns)
 *     from running 50 SQL queries upfront.
 *
 * Why not the standard Mantine `useScrollSpy`: the spy needs DOM headings
 * already mounted; our sections are intersected lazily and headings appear
 * over time. We track active section via the same `useIntersection`
 * observer the lazy-loaders use, which works incrementally and avoids a
 * second observer pass.
 */
export function DatasetSummaryView({ datasetId }: Props): JSX.Element {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const [meta, isLoadingMeta] = DatasetQueryClient.useGetDatasetMeta({
    datasetId,
    workspaceId: workspace.id,
    useQueryOptions: {
      staleTime: Infinity,
      refetchOnMount: false,
      retry: false,
      refetchOnWindowFocus: false,
    },
  });

  const [activeColumn, setActiveColumn] = useState<string | null>(null);

  if (isLoadingMeta || !meta) {
    return (
      <Stack gap="md">
        <Skeleton height={28} width={200} />
        <Skeleton height={100} />
        <Skeleton height={100} />
        <Skeleton height={100} />
      </Stack>
    );
  }

  return (
    <Box className={css.layout}>
      <Box className={css.nav} component="nav" aria-label={t`Column outline`}>
        <Stack gap={2}>
          <Text size="xs" tt="uppercase" c="dimmed" fw={600} mb="xs">
            <Trans>
              {meta.columns.length} columns · {meta.rows.toLocaleString()} rows
            </Trans>
          </Text>
          {meta.columns.map((col) => {
            const isActive = activeColumn === col.name;
            return (
              <Anchor
                key={col.name}
                href={`#col-${encodeURIComponent(col.name)}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(
                    `col-${encodeURIComponent(col.name)}`,
                  );
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className={`${css.navLink} ${isActive ? css.navLinkActive : ""}`}
              >
                <Group gap={6} wrap="nowrap" align="center">
                  <Box
                    style={{
                      width: 3,
                      height: 14,
                      borderRadius: 2,
                      backgroundColor:
                        isActive ?
                          "var(--mantine-color-primary-6)"
                        : "transparent",
                      flexShrink: 0,
                    }}
                  />
                  <Text
                    size="sm"
                    fw={isActive ? 600 : 400}
                    c={isActive ? "primary.7" : "neutral.7"}
                    truncate
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    {col.name}
                  </Text>
                  <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                    {_typeShortLabel(col.dataType, t)}
                  </Text>
                </Group>
              </Anchor>
            );
          })}
        </Stack>
      </Box>

      <ScrollArea className={css.content}>
        <Stack gap="xxl" pb="xxl">
          {meta.columns.map((col) => {
            return (
              <ColumnSection
                key={col.name}
                datasetId={datasetId}
                columnName={col.name}
                dataType={col.dataType}
                totalRows={meta.rows}
                onEnterView={() => {
                  return setActiveColumn(col.name);
                }}
              />
            );
          })}
        </Stack>
      </ScrollArea>
    </Box>
  );
}

type ColumnSectionProps = {
  datasetId: DatasetId;
  columnName: string;
  dataType: string;
  totalRows: number;
  onEnterView: () => void;
};

/**
 * One column's section in the outline. Wraps the actual summary body
 * with:
 *
 *   - an `IntersectionObserver` (via `useIntersection`) that triggers the
 *     per-column SQL fetch the first time the section is near the
 *     viewport (50% rootMargin so the body starts loading just before
 *     the user reaches it; near-zero perceived lag).
 *   - the active-section tracking that drives the sticky nav highlight.
 */
function ColumnSection({
  datasetId,
  columnName,
  dataType,
  totalRows,
  onEnterView,
}: ColumnSectionProps): JSX.Element {
  const { t } = useLingui();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { ref: intersectionRef, entry } = useIntersection({
    root: null,
    threshold: 0,
    rootMargin: "200px 0px 200px 0px",
  });
  const hasIntersectedRef = useRef(false);

  // Stitch the two refs onto the same element.
  const setRefs = (el: HTMLDivElement | null): void => {
    containerRef.current = el;
    intersectionRef(el);
  };

  // Trigger the lazy-load the first time the section is anywhere near
  // the viewport. The flag prevents the per-column query from being
  // re-issued on subsequent visibility flips.
  const isReadyToLoad =
    hasIntersectedRef.current || entry?.isIntersecting === true;
  if (entry?.isIntersecting && !hasIntersectedRef.current) {
    hasIntersectedRef.current = true;
  }

  // Drive the sticky-nav highlight: when the section's heading is in
  // the upper portion of the viewport, mark it active. We use the same
  // entry to avoid an extra observer pass.
  useEffect(() => {
    if (!entry) {
      return;
    }
    if (entry.isIntersecting && entry.boundingClientRect.top < 200) {
      onEnterView();
    }
  }, [entry, onEnterView]);

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
            {_typeFullLabel(dataType, t)}
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

type TranslateFn = ReturnType<typeof useLingui>["t"];

function _typeShortLabel(dataType: string, t: TranslateFn): string {
  if (dataType === "varchar") {
    return t`txt`;
  }
  if (dataType === "bigint" || dataType === "double") {
    return t`num`;
  }
  if (dataType === "date" || dataType === "time" || dataType === "timestamp") {
    return t`date`;
  }
  return dataType;
}

function _typeFullLabel(dataType: string, t: TranslateFn): string {
  if (dataType === "varchar") {
    return t`Text`;
  }
  if (dataType === "bigint") {
    return t`Whole number`;
  }
  if (dataType === "double") {
    return t`Decimal`;
  }
  if (dataType === "date") {
    return t`Date`;
  }
  if (dataType === "time") {
    return t`Time`;
  }
  if (dataType === "timestamp") {
    return t`Timestamp`;
  }
  return dataType;
}

// Exports for the other component, lint-friendly.
export { IconChevronRight, IconHash, RingProgress };
