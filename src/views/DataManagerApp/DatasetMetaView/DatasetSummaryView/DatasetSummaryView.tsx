import { Trans, useLingui } from "@lingui/react/macro";
import {
  Anchor,
  Box,
  Group,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import { Dataset } from "$/models/datasets/Dataset/Dataset";
import { useState } from "react";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { ActiveColumnContext } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/ActiveColumnContext";
import { ColumnSection } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/ColumnSection";
import { buildShortDataTypeLabel } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/datasetSummaryLabels";
import css from "./DatasetSummaryView.module.css";
import type { ReactNode } from "react";

type Props = {
  datasetId: Dataset.Id;
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
export function DatasetSummaryView({ datasetId }: Props): ReactNode {
  const { t, i18n } = useLingui();
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

  const [activeColumn, setActiveColumn] = useState<string | undefined>(
    undefined,
  );

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
    <Box
      className={css.datasetSummaryViewLayout}
      {...NuxAnchors.props(NuxAnchors.ids.datasetSummary)}
    >
      <Box
        className={css.datasetSummaryViewNav}
        component="nav"
        aria-label={t`Column outline`}
      >
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
                className={`${css.datasetSummaryViewNavLink} ${isActive ? css.datasetSummaryViewNavLinkActive : ""}`}
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
                    {buildShortDataTypeLabel(col.dataType, i18n)}
                  </Text>
                </Group>
              </Anchor>
            );
          })}
        </Stack>
      </Box>

      <ActiveColumnContext.Provider value={setActiveColumn}>
        <ScrollArea className={css.datasetSummaryViewContent}>
          <Stack gap="xxl" pb="xxl">
            {meta.columns.map((col) => {
              return (
                <ColumnSection
                  key={col.name}
                  datasetId={datasetId}
                  columnName={col.name}
                  dataType={col.dataType}
                  totalRows={meta.rows}
                />
              );
            })}
          </Stack>
        </ScrollArea>
      </ActiveColumnContext.Provider>
    </Box>
  );
}
