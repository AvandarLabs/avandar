import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";

import { getExportFilterReadout } from "@/views/GisApp/export/getExportFilterReadout/getExportFilterReadout";

type Props = { config: AvaMapConfig.T };

/** The first visible layer whose sensitivity suppresses individual points. */
function _findAggregateOnlyLayer(
  layers: readonly MapLayer.T[],
): MapLayer.T | undefined {
  return layers.find((layer) => {
    return layer.isVisible && layer.sensitivity.mode === "aggregateOnly";
  });
}

/**
 * Whether the basemap is a style known to photocopy poorly. Only a built-in
 * dark style is detectable today: a custom tile source carries no field
 * distinguishing a satellite layer from any other imagery.
 */
function _isDarkBasemap(basemap: AvaMapConfig.Basemap): boolean {
  return basemap.type === "builtIn" && basemap.style === "dark";
}

/**
 * States, in order, the active filters, any aggregate-only suppression, and
 * a dark basemap warning. Every notice here is a disclosure, never a gate:
 * Export snapshots whatever the screen already shows, so nothing in this
 * component may disable the download.
 */
export function ExportSheetNotices({ config }: Props): ReactNode {
  const { t } = useLingui();
  const filterReadout = getExportFilterReadout(config);
  const aggregateLayer = _findAggregateOnlyLayer(config.layers);
  const threshold =
    aggregateLayer?.sensitivity.mode === "aggregateOnly"
      ? aggregateLayer.sensitivity.minCellCount
      : undefined;

  return (
    <Stack gap="xs">
      {filterReadout.timeWindow !== undefined ? (
        <Text size="sm">{t`Time window: ${filterReadout.timeWindow}`}</Text>
      ) : null}
      {filterReadout.hasAoi ? (
        <Text size="sm">{t`Area of interest applied`}</Text>
      ) : null}
      {aggregateLayer !== undefined && threshold !== undefined ? (
        <Text size="sm">
          {t`This map includes ${aggregateLayer.name}, a layer set to Aggregate only. The export applies the same suppression as the screen: areas with fewer than ${threshold} records are shown as suppressed, never as zero.`}
        </Text>
      ) : null}
      {_isDarkBasemap(config.basemap) ? (
        <Text size="sm">{t`A dark or satellite basemap may photocopy poorly.`}</Text>
      ) : null}
    </Stack>
  );
}
