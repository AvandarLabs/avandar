import { Tooltip } from "@avandar/ui";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { IconVector } from "@tabler/icons-react";
import { useSyncExternalStore } from "react";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import css from "@/views/GisApp/shell/MapToolCluster/MapToolCluster.module.css";
import { UnavailableMapTool } from "@/views/GisApp/shell/MapToolCluster/UnavailableMapTool";
import type { DuckDbSpatialAvailability } from "@/clients/DuckDbClient/DuckDbSpatialAvailability/DuckDbSpatialAvailability";
import type { MapToolMode } from "@/views/GisApp/tools/MapToolMode.types";
import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";

type Props = {
  mapToolMode: MapToolMode;
  onMapToolModeChange: (mode: MapToolMode) => void;
};

function _subscribeSpatialAvailability(listener: () => void): () => void {
  return DuckDbClient.subscribeSpatialAvailability(listener);
}

function _getSpatialAvailability(): DuckDbSpatialAvailability {
  return DuckDbClient.getSpatialAvailability();
}

function _spatialUnavailableReason(
  i18n: I18n,
  availability: DuckDbSpatialAvailability,
): string {
  if (availability === "loading") {
    return i18n._(
      msg`This tool turns on when geometry support finishes downloading.`,
    );
  }
  return i18n._(
    msg`This tool needs geometry support, which could not be loaded.`,
  );
}

/** Area tool: available only while DuckDB Spatial can run GIS queries. */
export function AreaMapTool({
  mapToolMode,
  onMapToolModeChange,
}: Props): ReactNode {
  const { i18n } = useLingui();
  const availability = useSyncExternalStore(
    _subscribeSpatialAvailability,
    _getSpatialAvailability,
    _getSpatialAvailability,
  );
  const label = i18n._(msg`Draw an area to filter by`);
  const icon = <IconVector size={17} stroke={1.6} />;
  if (availability !== "available") {
    return (
      <UnavailableMapTool
        icon={icon}
        label={label}
        reason={_spatialUnavailableReason(i18n, availability)}
      />
    );
  }
  return (
    <Tooltip label={label}>
      <button
        type="button"
        className={css.mapToolClusterTool}
        aria-pressed={mapToolMode.type === "aoi"}
        aria-label={label}
        onClick={() => {
          onMapToolModeChange({ type: "aoi" });
        }}
      >
        {icon}
      </button>
    </Tooltip>
  );
}
