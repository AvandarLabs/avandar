import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { IconCircleDashed } from "@tabler/icons-react";
import { useSyncExternalStore } from "react";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { BufferMapToolPopover } from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapToolPopover";
import { UnavailableMapTool } from "@/views/GisApp/shell/MapToolCluster/UnavailableMapTool";
import type { DuckDbSpatialAvailability } from "@/clients/DuckDbClient/DuckDbSpatialAvailability/DuckDbSpatialAvailability";
import type { I18n } from "@lingui/core";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  selectedLayer: MapLayer.T | undefined;
  onBufferConfirm: (options: {
    distanceMeters: number;
    dissolve: boolean;
  }) => void;
};

function _subscribeSpatialAvailability(listener: () => void): () => void {
  return DuckDbClient.subscribeSpatialAvailability(listener);
}

function _getSpatialAvailability(): DuckDbSpatialAvailability {
  return DuckDbClient.getSpatialAvailability();
}

function _bufferUnavailableReason(
  i18n: I18n,
  availability: DuckDbSpatialAvailability,
  selectedLayer: MapLayer.T | undefined,
): string | undefined {
  if (availability === "loading") {
    return i18n._(
      msg`This tool turns on when geometry support finishes downloading.`,
    );
  }
  if (availability !== "available") {
    return i18n._(
      msg`This tool needs geometry support, which could not be loaded.`,
    );
  }
  if (!selectedLayer) {
    return i18n._(msg`Select a data layer to buffer.`);
  }
  if (!selectedLayer.geoBinding) {
    return i18n._(msg`Bind geometry on the selected layer to buffer it.`);
  }
  if (selectedLayer.geoBinding.type === "latLngColumns") {
    return i18n._(
      msg`Buffer needs a layer with compiled geometry, not latitude and longitude columns.`,
    );
  }
  return undefined;
}

/** Buffer tool: inserts a buffer of the selected data layer. */
export function BufferMapTool({
  selectedLayer,
  onBufferConfirm,
}: Props): ReactNode {
  const { i18n } = useLingui();
  const availability = useSyncExternalStore(
    _subscribeSpatialAvailability,
    _getSpatialAvailability,
    _getSpatialAvailability,
  );
  const label = i18n._(msg`Buffer around a layer`);
  const icon = <IconCircleDashed size={17} stroke={1.6} />;
  const reason = _bufferUnavailableReason(i18n, availability, selectedLayer);
  if (reason) {
    return <UnavailableMapTool icon={icon} label={label} reason={reason} />;
  }
  return (
    <BufferMapToolPopover
      label={label}
      icon={icon}
      onBufferConfirm={onBufferConfirm}
    />
  );
}
