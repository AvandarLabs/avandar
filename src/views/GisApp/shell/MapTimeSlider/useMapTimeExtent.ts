import { useQuery } from "@avandar/query-hooks";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import { getMapTimeExtentSql } from "@/clients/maps/MapLayerTimeExtent/getMapTimeExtentSql/getMapTimeExtentSql";
import { WorkspaceQetlClient } from "@/clients/qetl/WorkspaceQetlClient/WorkspaceQetlClient";
import { getIsoInstantFromValue } from "@/views/GisApp/shell/MapTimeSlider/getIsoInstantFromValue/getIsoInstantFromValue";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Workspace } from "$/models/Workspace/Workspace";

type TimeExtentLayer = {
  sourceSql: string;
  timeColumnName: string;
};

function _participatingTimeLayers(
  layers: readonly MapLayer.T[],
): TimeExtentLayer[] {
  return layers.flatMap((layer) => {
    if (!layer.timeColumn) {
      return [];
    }
    const column = layer.source.queryColumns.find((item) => {
      return item.id === layer.timeColumn;
    });
    const sourceSql = structuredQueryToSql(layer.source);
    if (!column || sourceSql === "") {
      return [];
    }
    return [
      {
        sourceSql,
        timeColumnName: QueryColumn.getDerivedColumnName(column),
      },
    ];
  });
}

function _timeRangeFromExtentRow(
  row: { extent_start?: unknown; extent_end?: unknown } | undefined,
): AvaMapConfig.TimeRange | undefined {
  if (!row) {
    return undefined;
  }
  const start = getIsoInstantFromValue(row.extent_start);
  const end = getIsoInstantFromValue(row.extent_end);
  if (!start || !end) {
    return undefined;
  }
  return { start, end };
}

/**
 * Queries the union min/max timestamp extent across layers with a time column.
 *
 * AOI is intentionally omitted: the clock extent is independent of the area
 * filter.
 */
export function useMapTimeExtent(options: {
  layers: readonly MapLayer.T[];
  workspaceId: Workspace.Id;
}): AvaMapConfig.TimeRange | undefined {
  const participating = _participatingTimeLayers(options.layers);
  const rawSql = getMapTimeExtentSql(participating);
  const [result] = useQuery({
    enabled: rawSql !== undefined,
    queryKey: ["mapTimeExtent", options.workspaceId, rawSql],
    queryFn: async ({ signal }) => {
      if (rawSql === undefined) {
        throw new Error("Map time extent SQL is missing");
      }
      return await WorkspaceQetlClient.runQuery<{
        extent_start: unknown;
        extent_end: unknown;
      }>({
        rawSql,
        workspaceId: options.workspaceId,
        signal,
      });
    },
  });
  return _timeRangeFromExtentRow(result?.data[0]);
}
