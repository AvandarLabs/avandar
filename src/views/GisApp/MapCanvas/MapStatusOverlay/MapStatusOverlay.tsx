import { Trans, useLingui } from "@lingui/react/macro";
import { Alert, Loader, Paper, Text } from "@mantine/core";
import css from "@/views/GisApp/MapCanvas/MapStatusOverlay/MapStatusOverlay.module.css";
import type { GeometryDropReport } from "@/views/GisApp/layers/toFeatureCollection/toFeatureCollection";
import type { ReactNode } from "react";

type Props = {
  isLoading: boolean;
  error: Error | undefined;
  hasBinding: boolean;
  featureCount: number;
  drops: readonly GeometryDropReport[];
};

/**
 * The overlay container. `role="status"` announces every state change to
 * assistive technology, which is otherwise silent because this overlay is the
 * map's only status channel.
 */
function StatusShell({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className={css.mapStatusOverlay} role="status" aria-live="polite">
      {children}
    </div>
  );
}

/** Warns that some or all rows carried coordinates that could not be mapped. */
function DroppedRowsAlert({
  featureCount,
  droppedRowCount,
}: {
  featureCount: number;
  droppedRowCount: number;
}): ReactNode {
  const { t } = useLingui();
  const totalRowCount = featureCount + droppedRowCount;
  const isEverythingDropped = featureCount === 0;

  return (
    <Alert
      color="warning"
      title={
        isEverythingDropped ?
          t`No rows could be mapped`
        : t`Some rows could not be mapped`
      }
    >
      <Text size="sm">
        {isEverythingDropped ?
          t`None of the ${totalRowCount} rows could be mapped because their coordinates were missing or out of range.`
        : t`${droppedRowCount} of ${totalRowCount} rows were skipped because their coordinates were missing or out of range.`
        }
      </Text>
    </Alert>
  );
}

/**
 * Reports what the map is doing when it is not simply showing data: loading,
 * failed, unconfigured, empty, or silently dropping rows.
 */
export function MapStatusOverlay({
  isLoading,
  error,
  hasBinding,
  featureCount,
  drops,
}: Props): ReactNode {
  const { t } = useLingui();
  const droppedRowCount = drops.reduce((total, drop) => {
    return total + drop.count;
  }, 0);

  if (error) {
    return (
      <StatusShell>
        <Alert color="danger" title={t`Could not load map data`}>
          <Text size="sm">
            <Trans>Something went wrong while loading this layer's data.</Trans>
          </Text>
          {/*
            The raw message is client/engine text that is never translated, so
            it is shown only in development rather than to users.
          */}
          {import.meta.env.DEV ?
            <Text size="xs" c="dimmed" mt="xs">
              {error.message}
            </Text>
          : null}
        </Alert>
      </StatusShell>
    );
  }
  if (isLoading) {
    return (
      <StatusShell>
        <Paper p="xs" radius="md" withBorder>
          <Loader size="sm" aria-label={t`Loading map data`} />
        </Paper>
      </StatusShell>
    );
  }
  if (!hasBinding) {
    return (
      <StatusShell>
        <Paper p="xs" radius="md" withBorder>
          <Text size="sm">
            <Trans>
              Pick a data source and its latitude and longitude columns to plot
              it.
            </Trans>
          </Text>
        </Paper>
      </StatusShell>
    );
  }
  if (droppedRowCount > 0) {
    return (
      <StatusShell>
        <DroppedRowsAlert
          featureCount={featureCount}
          droppedRowCount={droppedRowCount}
        />
      </StatusShell>
    );
  }
  if (featureCount === 0) {
    return (
      <StatusShell>
        <Paper p="xs" radius="md" withBorder>
          <Text size="sm">
            <Trans>No mappable rows in this data source.</Trans>
          </Text>
        </Paper>
      </StatusShell>
    );
  }
  return null;
}
