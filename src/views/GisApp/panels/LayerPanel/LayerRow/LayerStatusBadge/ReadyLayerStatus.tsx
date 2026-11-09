import { Plural, useLingui } from "@lingui/react/macro";
import { Badge } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  droppedRowCount: number;
  featureCount: number;
  /** The layer's binding, which decides whether it draws points or areas. */
  geoBinding: MapLayer.GeoBinding | undefined;
};

/** A ready layer's feature count, named as points, areas, or features. */
function FeatureCount({
  featureCount,
  geoBinding,
}: Omit<Props, "droppedRowCount">): ReactNode {
  if (MapLayer.isAreaGeoBinding(geoBinding)) {
    return <Plural value={featureCount} one="# area" other="# areas" />;
  }
  if (geoBinding === undefined || MapLayer.isPointGeoBinding(geoBinding)) {
    return <Plural value={featureCount} one="# point" other="# points" />;
  }
  return <Plural value={featureCount} one="# feature" other="# features" />;
}

/** Reports mapped and unmapped counts for a ready layer. */
export function ReadyLayerStatus({
  droppedRowCount,
  featureCount,
  geoBinding,
}: Props): ReactNode {
  const { t } = useLingui();
  if (droppedRowCount > 0) {
    return (
      <Badge
        color="warning"
        variant="light"
        size="xs"
        leftSection={<IconAlertTriangle size={9} stroke={2.4} />}
      >
        {t`${droppedRowCount} rows unmapped`}
      </Badge>
    );
  }
  return <FeatureCount featureCount={featureCount} geoBinding={geoBinding} />;
}
