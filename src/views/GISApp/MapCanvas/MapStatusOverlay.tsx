import { useLingui } from "@lingui/react/macro";
import { Alert, Loader, Paper, Text } from "@mantine/core";
import classes from "@/views/GISApp/MapCanvas/MapCanvas.module.css";
import type { GeometryDropReport } from "@/views/GISApp/layers/toFeatureCollection/toFeatureCollection";

type Props = {
  isLoading: boolean;
  error: Error | null;
  hasBinding: boolean;
  featureCount: number;
  drops: readonly GeometryDropReport[];
};

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
}: Props): JSX.Element | null {
  const { t } = useLingui();
  const droppedRowCount = drops.reduce((total, drop) => {
    return total + drop.count;
  }, 0);

  if (error) {
    return (
      <div className={classes.statusOverlay}>
        <Alert color="danger" title={t`Could not load map data`}>
          {error.message}
        </Alert>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className={classes.statusOverlay}>
        <Paper p="xs" radius="md" withBorder>
          <Loader size="sm" aria-label={t`Loading map data`} />
        </Paper>
      </div>
    );
  }
  if (!hasBinding) {
    return (
      <div className={classes.statusOverlay}>
        <Paper p="xs" radius="md" withBorder>
          <Text size="sm">
            {t`Pick a data source and its latitude and longitude columns to plot it.`}
          </Text>
        </Paper>
      </div>
    );
  }
  if (droppedRowCount > 0) {
    const totalRowCount = featureCount + droppedRowCount;
    const isEverythingDropped = featureCount === 0;
    return (
      <div className={classes.statusOverlay}>
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
      </div>
    );
  }
  if (featureCount === 0) {
    return (
      <div className={classes.statusOverlay}>
        <Paper p="xs" radius="md" withBorder>
          <Text size="sm">{t`No mappable rows in this data source.`}</Text>
        </Paper>
      </div>
    );
  }
  return null;
}
