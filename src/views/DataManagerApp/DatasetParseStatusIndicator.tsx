import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

import { Tooltip } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Loader, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import {
  estimateRemainingTimeFromJob,
  useImportJob,
} from "@/clients/datasets/ImportJobsManager";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";

type Props = {
  datasetId: DatasetId;
};

/**
 * Inline badge surfaced next to a dataset's name while its background
 * parquet transcoding is in flight. Renders nothing once the dataset is
 * ready.
 *
 * Three visual states:
 *   - active job in `ImportJobsManager` → spinner + ETA tooltip
 *   - LocalDataset row says `parsing` but no active job → "Waiting to
 *     resume" spinner (likely a tab that just reopened and is about to
 *     redrive the background parquet transcoding from the cached source
 *     bytes).
 *   - LocalDataset row says `failed` → warning icon + reason tooltip.
 */
export function DatasetParseStatusIndicator({
  datasetId,
}: Props): JSX.Element | null {
  const { t } = useLingui();
  const activeJob = useImportJob(datasetId);
  const [localDataset] = LocalDatasetClient.useGetById({ id: datasetId });

  // Live in-flight background parquet transcoding.
  if (activeJob?.status === "running") {
    const eta = estimateRemainingTimeFromJob(activeJob);
    const remainingLabel =
      eta === undefined
        ? undefined
        : eta.kind === "lessThanMinute"
          ? t`less than a minute`
          : eta.kind === "aboutMinute"
            ? t`about a minute`
            : t`about ${eta.minutes} minutes`;
    const tooltipLabel = remainingLabel
      ? t`Processing, ${remainingLabel} remaining`
      : t`Processing dataset…`;
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
        <Tooltip label={t`Resuming dataset processing…`}>
          <Loader size="xs" />
        </Tooltip>
      );
    }
    return null;
  }

  if (localDataset.parseStatus === "failed") {
    const reason = localDataset.parseFailedReason ?? t`Unknown error`;
    return (
      <Tooltip label={t`Import failed: ${reason}`}>
        <Text c="red" component="span" lh={1} display="inline-flex">
          <IconAlertTriangle size={16} />
        </Text>
      </Tooltip>
    );
  }

  return null;
}
