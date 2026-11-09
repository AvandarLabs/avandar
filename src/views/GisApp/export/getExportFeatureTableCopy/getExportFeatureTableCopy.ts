import { propEq } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { BUFFER_DISTANCE_UNIT_LABELS } from "@/views/GisApp/layers/BufferDistanceUnit.constants";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { I18n } from "@lingui/core";

/** The buffer that filters a layer, and the name of the layer it buffers. */
type BufferFilter = {
  binding: MapLayer.BufferOfLayerBinding;
  sourceLayerName: string;
};

/** The buffer filtering `layer`, or undefined when no buffer filters it. */
function _getBufferFilter(
  options: Readonly<{ config: AvaMapConfig.T; layer: MapLayer.T }>,
): BufferFilter | undefined {
  const { config, layer } = options;
  const filterLayerId = layer.spatialFilter?.layerId;
  const binding =
    filterLayerId === undefined
      ? undefined
      : config.layers.find(propEq("id", filterLayerId))?.geoBinding;
  if (binding?.type !== "bufferOfLayer") {
    return undefined;
  }
  const sourceLayer = config.layers.find(propEq("id", binding.layerId));
  return sourceLayer === undefined
    ? undefined
    : { binding, sourceLayerName: sourceLayer.name };
}

/** A buffer's distance in the unit it was typed in, for example "0.5 mi". */
function _formatBufferDistance(
  options: Readonly<{ binding: MapLayer.BufferOfLayerBinding; i18n: I18n }>,
): string {
  const { binding, i18n } = options;
  const distance = i18n.number(
    MapLayer.getBufferDistanceFromMeters({
      distanceMeters: binding.distanceMeters,
      unit: binding.distanceUnit,
    }),
    { maximumFractionDigits: 2 },
  );
  const unit = i18n._(BUFFER_DISTANCE_UNIT_LABELS[binding.distanceUnit]);
  return i18n._(msg`${distance} ${unit}`);
}

/** "{count} {layer}" or "{count} {layer} within {distance} of {source}". */
function _getSummaryLine(
  options: Readonly<{
    countText: string;
    layerName: string;
    bufferFilter: BufferFilter | undefined;
    i18n: I18n;
  }>,
): string {
  const { countText, layerName, bufferFilter, i18n } = options;
  if (bufferFilter === undefined) {
    return i18n._(msg`${countText} ${layerName}`);
  }
  const distanceText = _formatBufferDistance({
    binding: bufferFilter.binding,
    i18n,
  });
  const sourceLayerName = bufferFilter.sourceLayerName;
  return i18n._(
    msg`${countText} ${layerName} within ${distanceText} of ${sourceLayerName}`,
  );
}

/** How many of a table's columns the PDF prints, out of how many chosen. */
export type ExportColumnCounts = { shownCount: number; totalCount: number };

/**
 * Builds the note printed when the page is too narrow for every column. When
 * the row cap also cut the list, one sentence states both cuts, so the reader
 * is pointed at the CSV once.
 */
function _makeColumnLimitNoteBuilder(
  options: Readonly<{
    countText: string;
    shownText: string;
    isRowCut: boolean;
    i18n: I18n;
  }>,
): (columnCounts: ExportColumnCounts) => string {
  const { countText, shownText, isRowCut, i18n } = options;
  return (columnCounts) => {
    const shownColumnsText = i18n.number(columnCounts.shownCount);
    const totalColumnsText = i18n.number(columnCounts.totalCount);
    return isRowCut
      ? i18n._(
          msg`Showing ${shownText} of ${countText} rows and ${shownColumnsText} of ${totalColumnsText} columns. Download the full list as CSV from the map.`,
        )
      : i18n._(
          msg`Showing ${shownColumnsText} of ${totalColumnsText} columns. Download the full list as CSV from the map.`,
        );
  };
}

/**
 * The line printed above the PDF feature table, the note printed under it
 * when the row cap cut the list, and a builder for the note that replaces it
 * when the page is too narrow for every column. All are localized here, with
 * `msg`, because this runs at download time outside any component.
 */
export function getExportFeatureTableCopy(
  options: Readonly<{
    config: AvaMapConfig.T;
    layer: MapLayer.T;
    totalCount: number;
    shownCount: number;
    i18n: I18n;
  }>,
): {
  summaryLine: string;
  truncationNote: string | undefined;
  buildColumnLimitNote: (columnCounts: ExportColumnCounts) => string;
} {
  const { config, layer, totalCount, shownCount, i18n } = options;
  const countText = i18n.number(totalCount);
  const shownText = i18n.number(shownCount);
  const isRowCut = shownCount < totalCount;
  return {
    summaryLine: _getSummaryLine({
      countText,
      layerName: layer.name,
      bufferFilter: _getBufferFilter({ config, layer }),
      i18n,
    }),
    truncationNote: isRowCut
      ? i18n._(
          msg`Showing ${shownText} of ${countText}. Download the full list as CSV from the map.`,
        )
      : undefined,
    buildColumnLimitNote: _makeColumnLimitNoteBuilder({
      countText,
      shownText,
      isRowCut,
      i18n,
    }),
  };
}
