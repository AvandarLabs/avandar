import { noop } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { IconCircleDashed } from "@tabler/icons-react";
import { useSyncExternalStore } from "react";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { getBufferLabelColumnsFromMapLayer } from "@/views/GisApp/layers/getBufferLabelColumnsFromMapLayer/getBufferLabelColumnsFromMapLayer";
import { BufferMapToolPopover } from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapToolPopover";
import { UnavailableMapTool } from "@/views/GisApp/shell/MapToolCluster/UnavailableMapTool";
import type { DuckDbSpatialAvailability } from "@/clients/DuckDbClient/DuckDbSpatialAvailability/DuckDbSpatialAvailability";
import type {
  BufferConfirmOptions,
  BufferLabelColumnOption,
  FilterByBufferOptions,
} from "@/views/GisApp/shell/MapToolCluster/BufferMapTool/BufferMapTool.types";
import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";

type Props = {
  selectedLayer: MapLayer.T | undefined;
  layers?: readonly MapLayer.T[];
  onBufferConfirm: (options: BufferConfirmOptions) => MapLayer.Id | undefined;
  onFilterByBuffer?: (options: FilterByBufferOptions) => void;
};

const EMPTY_LAYERS: readonly MapLayer.T[] = [];

function _subscribeSpatialAvailability(listener: () => void): () => void {
  return DuckDbClient.subscribeSpatialAvailability(listener);
}

function _getSpatialAvailability(): DuckDbSpatialAvailability {
  return DuckDbClient.getSpatialAvailability();
}

/** Why the selected layer cannot be buffered, or undefined when it can. */
function _getLayerUnavailableReason(
  i18n: I18n,
  selectedLayer: MapLayer.T | undefined,
): string | undefined {
  if (!selectedLayer) {
    return i18n._(msg`Select a data layer to buffer.`);
  }
  if (!selectedLayer.geoBinding) {
    return i18n._(msg`Bind geometry on the selected layer to buffer it.`);
  }
  // Rings drawn around a displaced layer's exact points would reveal them.
  if (selectedLayer.sensitivity.mode === "jitter") {
    return i18n._(
      msg`Buffers are off for layers set to Displace, since rings would reveal their exact locations.`,
    );
  }
  return undefined;
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
  return _getLayerUnavailableReason(i18n, selectedLayer);
}

/** Source columns a ring can carry: only for layers drawn from rows. */
function _getLabelColumnOptions(
  layer: MapLayer.T | undefined,
): BufferLabelColumnOption[] {
  if (!layer) {
    return [];
  }
  return getBufferLabelColumnsFromMapLayer(layer).map((column) => {
    return {
      value: column.id,
      label: QueryColumn.getDerivedColumnName(column),
    };
  });
}

/**
 * Buffer tool: inserts a buffer of the selected data layer, then offers to
 * filter a point layer by it.
 */
export function BufferMapTool({
  selectedLayer,
  layers = EMPTY_LAYERS,
  onBufferConfirm,
  onFilterByBuffer = noop,
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
      layers={layers}
      labelColumnOptions={_getLabelColumnOptions(selectedLayer)}
      canFilterAnotherLayer={layers.some((layer) => {
        return (
          layer.id !== selectedLayer?.id &&
          MapLayer.isPointGeoBinding(layer.geoBinding)
        );
      })}
      onBufferConfirm={onBufferConfirm}
      onFilterByBuffer={onFilterByBuffer}
    />
  );
}
