import { Loader, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Tooltip } from "@ui";
import {
  estimateRemainingFromJob,
  useImportJob,
} from "@/clients/datasets/ImportJobsManager";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

type Props = {
  datasetId: DatasetId;
};

/**
 * Inline badge surfaced next to a dataset's name while its parquet
 * transcode (Phase B) is in flight. Renders nothing once the dataset is
 * ready.
 *
 * Three visual states:
 *   - active job in `ImportJobsManager` → spinner + ETA tooltip
 *   - LocalDataset row says `parsing` but no active job → "Waiting to
 *     resume" spinner (likely a tab that just reopened and is about to
 *     redrive Phase B from the cached source bytes).
 *   - LocalDataset row says `failed` → warning icon + reason tooltip.
 */
export function DatasetParseStatusIndicator({ datasetId }: Props): JSX.Element | null {
  const activeJob = useImportJob(datasetId);
  const [localDataset] = LocalDatasetClient.useGetById({ id: datasetId });

  // Live in-flight transcode.
  if (activeJob?.status === "running") {
    const eta = estimateRemainingFromJob(activeJob);
    const tooltipLabel =
      eta ? `Processing — ${eta} remaining` : "Processing dataset…";
    return (
      <Tooltip label={tooltipLabel}>
        <Loader size="xs" />
      </Tooltip>
    );
  }

  if (!localDataset) {
    return null;
  }

  if (
    localDataset.parseStatus === "parsing" ||
    localDataset.parseStatus === undefined
  ) {
    // Stalled / waiting on resume. Hover shows the file size as a weak
    // signal that there's progress queued.
    if (localDataset.parseStatus === "parsing") {
      return (
        <Tooltip label="Resuming dataset processing…">
          <Loader size="xs" />
        </Tooltip>
      );
    }
    return null;
  }

  if (localDataset.parseStatus === "failed") {
    const reason = localDataset.parseFailedReason ?? "Unknown error";
    return (
      <Tooltip label={`Import failed: ${reason}`}>
        <Text c="red" component="span" lh={1} display="inline-flex">
          <IconAlertTriangle size={16} />
        </Text>
      </Tooltip>
    );
  }

  return null;
}
