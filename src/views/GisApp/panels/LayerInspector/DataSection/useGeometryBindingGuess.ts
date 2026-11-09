import { Model } from "@avandar/models";
import { useQuery } from "@avandar/query-hooks";
import { useMemo } from "react";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { makeRelationRefFromQueryDataSource } from "$/models/relations/RelationRef/makeRelationRefFromQueryDataSource";
import { RelationRef } from "$/models/relations/RelationRef/RelationRef";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { buildGeometrySampleSql } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/buildGeometrySampleSql";
import { getGeometryBindingGuessFromColumns } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeometryBindingGuessFromColumns";
import { useDuckDbSpatialAvailability } from "@/views/GisApp/useDuckDbSpatialAvailability";
import type { QueryColumn as QueryColumnModel } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { GeometryBindingGuess } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeometryBindingGuessFromColumns";

type GeometryBindingSample = {
  guess: GeometryBindingGuess | undefined;
  isSettled: boolean;
  rows: readonly UnknownRow[] | undefined;
  isSpatialUnavailable: boolean;
};

async function _runGeometrySample(options: {
  dataSource: QueryDataSource.T;
  columnNames: readonly string[];
  signal: AbortSignal;
}): Promise<{ data: UnknownRow[] }> {
  const { dataSource, columnNames, signal } = options;
  return await WorkspaceQuerySession.runQuery({
    rawSql: buildGeometrySampleSql({
      tableName: RelationRef.toTableName(
        makeRelationRefFromQueryDataSource(dataSource),
      ),
      columnNames,
    }),
    workspaceId: dataSource.workspaceId,
    signal,
    neededColumnsByDatasetId: Model.isOfModelType(dataSource, "Dataset")
      ? { [dataSource.id]: columnNames }
      : undefined,
  });
}

function _textColumnNames(columns: readonly QueryColumnModel.T[]): string[] {
  return columns.flatMap((column) => {
    return QueryColumn.isNumeric(column)
      ? []
      : [QueryColumn.getDerivedColumnName(column)];
  });
}

function _guessFromRows(
  columnNames: readonly string[],
  rows: readonly UnknownRow[] | undefined,
): GeometryBindingGuess | undefined {
  if (!rows) {
    return undefined;
  }
  return getGeometryBindingGuessFromColumns(
    columnNames.map((name) => {
      return {
        name,
        sampleValues: rows.map((row) => {
          return row[name];
        }),
      };
    }),
  );
}

/**
 * Loads a few rows and guesses which column holds geometry, and as what.
 *
 * The layer inspector uses it to default a new layer, for example a survey
 * whose only coordinates are a `location` column of points.
 */
export function useGeometryBindingGuess(
  options: Readonly<{
    dataSource: QueryDataSource.T | undefined;
    columns: readonly QueryColumnModel.T[];
  }>,
): GeometryBindingSample {
  const spatial = useDuckDbSpatialAvailability();
  const dataSource = options.dataSource;
  const columnNames = useMemo(() => {
    return _textColumnNames(options.columns);
  }, [options.columns]);
  const shouldSample =
    dataSource !== undefined &&
    columnNames.length > 0 &&
    spatial !== "unavailable";
  const [result, , query] = useQuery({
    enabled: shouldSample,
    queryKey: ["geometry-binding-sample", dataSource, columnNames],
    queryFn: async ({ signal }) => {
      if (!dataSource) {
        throw new Error("Geometry sample has no data source");
      }
      return await _runGeometrySample({ dataSource, columnNames, signal });
    },
  });
  const rows = result?.data;
  const guess = useMemo(() => {
    return _guessFromRows(columnNames, rows);
  }, [columnNames, rows]);
  return {
    guess,
    isSettled: !shouldSample || query.isSuccess || query.isError,
    rows,
    isSpatialUnavailable: spatial === "unavailable",
  };
}
