import { Skeleton, Stack } from "@mantine/core";
import { Dataset } from "$/models/datasets/Dataset/Dataset";
import { DatasetQueryClient } from "@/clients/datasets/DatasetQueryClient";
import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { ColumnSection } from "@/views/DataManagerApp/DatasetMetaView/DatasetSummaryView/ColumnSection/ColumnSection";
import type { ReactNode } from "react";

type Props = {
  datasetId: Dataset.Id;
};

/**
 * A read of what is actually in a dataset, one column at a time.
 *
 * Each section leads with a one-sentence plain-language characterisation,
 * then a type-appropriate visual: the most common values as bars, a min to
 * max range with the mean marked, a timespan. Sections are separated by a
 * rule rather than by empty space, which is what lets fifty columns stay
 * scannable.
 *
 * Each section is lazy: its per-column query only fires when the section
 * scrolls into view, so a wide dataset does not run fifty SQL queries
 * upfront.
 *
 * The table of contents lives in the view's rail, above in
 * `DatasetMetaView`, because the outline and the record's other properties
 * are the same kind of thing and belong in the same column.
 *
 * Why not Mantine's `useScrollSpy`: the spy needs DOM headings already
 * mounted; our sections are intersected lazily and headings appear over
 * time. We track the active section via the same `useIntersection` observer
 * the lazy-loaders use, which works incrementally and avoids a second
 * observer pass.
 */
export function DatasetSummaryView({ datasetId }: Readonly<Props>): ReactNode {
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

  if (isLoadingMeta || !meta) {
    return (
      <Stack gap="xl">
        <Skeleton height={96} radius="sm" />
        <Skeleton height={96} radius="sm" />
        <Skeleton height={96} radius="sm" />
      </Stack>
    );
  }

  return (
    <Stack gap={0} {...NuxAnchors.props(NuxAnchors.ids.datasetSummary)}>
      {meta.columns.map((column) => {
        return (
          <ColumnSection
            key={column.name}
            datasetId={datasetId}
            columnName={column.name}
            dataType={column.dataType}
            totalRows={meta.rows}
          />
        );
      })}
    </Stack>
  );
}
