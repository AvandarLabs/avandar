import { Model } from "@avandar/models";
import { prop, propEq } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { QueryColumnReconciliation } from "$/models/queries/QueryColumn/QueryColumnReconciliation/QueryColumnReconciliation";
import { normalizeQueryFilters } from "$/models/queries/StructuredQuery/normalizeQueryFilters/normalizeQueryFilters";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";

type GetQueryOptions = {
  query: StructuredQuery.Partial;
  previous: StructuredQuery.Partial | undefined;
  previousInput: StructuredQuery.Partial | undefined;
  columns: readonly QueryColumn.T[];
};

type MapSourceHydrationOptions = {
  config: AvaMapConfig.T;
  previousConfig?: AvaMapConfig.T;
  previousInput?: AvaMapConfig.T;
  datasetColumns: readonly DatasetColumn.T[] | undefined;
  conceptAttributes: readonly ConceptAttribute.T[] | undefined;
};

type HydrationResult = {
  config: AvaMapConfig.T;
  issues: ReturnType<typeof normalizeQueryFilters>["issues"];
};

function _getLayerFromMetadata({
  layer,
  options,
}: {
  layer: AvaMapConfig.T["layers"][number];
  options: Readonly<MapSourceHydrationOptions>;
}): {
  layer: AvaMapConfig.T["layers"][number];
  issues: HydrationResult["issues"];
} {
  const source = layer.source.dataSource;
  if (!source) {
    return { layer, issues: [] };
  }
  const metadata = _getColumns({ source: source, options: options });
  const previous = options.previousConfig?.layers.find(
    propEq("id", layer.id),
  )?.source;
  const previousInput = options.previousInput?.layers.find(
    propEq("id", layer.id),
  )?.source;
  if (metadata === undefined) {
    return {
      layer: _getPendingLayer({
        layer: layer,
        previous: previous,
        previousInput: previousInput,
      }),
      issues: [],
    };
  }

  const query = _getQuery({
    query: layer.source,
    previous,
    previousInput,
    columns: metadata,
  });
  const filters = normalizeQueryFilters({
    filter: query.filters,
    columns: query.sourceColumns ?? [],
    clause: "where",
  });
  const having = normalizeQueryFilters({
    filter: query.having,
    columns: _getHavingColumns(query),
    clause: "having",
  });
  return {
    layer: {
      ...layer,
      source: { ...query, filters: filters.filter, having: having.filter },
    },
    issues: [...filters.issues, ...having.issues],
  };
}

function _getHavingColumns(query: StructuredQuery.Partial): QueryColumn.T[] {
  return query.queryColumns
    .map((column) => {
      return { ...column, aggregation: query.aggregations[column.id] };
    })
    .filter((column) => {
      return column.aggregation !== undefined && column.aggregation !== "none";
    });
}

/**
 * A case type's query columns, built from all of its fields at once because a
 * field's view column depends on the other fields' names.
 */
function _makeConceptColumns({
  conceptId,
  options,
}: {
  conceptId: Concept.Id;
  options: Readonly<MapSourceHydrationOptions>;
}): QueryColumn.T[] | undefined {
  const attributes = options.conceptAttributes?.filter(
    propEq("conceptId", conceptId),
  );
  return attributes && QueryColumn.makeFromConceptAttributes(attributes);
}

function _getColumns({
  source,
  options,
}: {
  source: NonNullable<StructuredQuery.Partial["dataSource"]>;
  options: Readonly<MapSourceHydrationOptions>;
}): QueryColumn.T[] | undefined {
  return Model.isOfModelType(source, "Dataset")
    ? options.datasetColumns
        ?.filter(propEq("datasetId", source.id))
        .map(QueryColumn.makeFromDatasetColumn)
    : _makeConceptColumns({ conceptId: source.id, options });
}

function _getQuery(options: GetQueryOptions): StructuredQuery.Partial {
  const { query, previous, previousInput, columns } = options;
  const sourceKey = Model.getTypedId(query.dataSource!);
  const previousSourceKey = previous?.dataSource
    ? Model.getTypedId(previous.dataSource)
    : sourceKey;
  const sourceColumns = QueryColumnReconciliation.reconcileSourceColumns({
    sourceKey,
    previousSourceKey,
    previous: query.sourceColumns ?? previous?.sourceColumns ?? [],
    incoming: columns,
  });
  return {
    ...query,
    sourceColumns,
    filters:
      previousInput?.filters === query.filters
        ? (previous?.filters ?? query.filters)
        : query.filters,
    having:
      previousInput?.having === query.having
        ? (previous?.having ?? query.having)
        : query.having,
    queryColumns: query.queryColumns.map((column) => {
      const source = sourceColumns.find((candidate) => {
        return (
          candidate.baseColumn.__type === column.baseColumn.__type &&
          candidate.baseColumn.id === column.baseColumn.id
        );
      });
      return source
        ? QueryColumn.refreshFromSourceColumn({ column, sourceColumn: source })
        : column;
    }),
  };
}

function _getPendingLayer({
  layer,
  previous,
  previousInput,
}: {
  layer: AvaMapConfig.T["layers"][number];
  previous: StructuredQuery.Partial | undefined;
  previousInput: StructuredQuery.Partial | undefined;
}): AvaMapConfig.T["layers"][number] {
  const source = layer.source.dataSource;
  const isRetained =
    previousInput?.filters === layer.source.filters &&
    previous?.dataSource?.id === source?.id &&
    previous?.dataSource?.__type === source?.__type;
  return isRetained && previous
    ? {
        ...layer,
        source: {
          ...layer.source,
          sourceColumns: previous.sourceColumns,
          filters: previous.filters,
          having: previous.having,
        },
      }
    : layer;
}

/**
 * Fills in each map layer's source columns from loaded dataset and concept
 * metadata and binds its saved filters to column IDs, so the layer's query
 * can apply them. A filter that matches no column, or several, is dropped
 * and reported as an issue. Hydrating never schedules a map save. Used by
 * `useHydratedMapSources`.
 */
export const MapSourceHydration = {
  fromMetadata: (
    options: Readonly<MapSourceHydrationOptions>,
  ): HydrationResult => {
    const results = options.config.layers.map((layer) => {
      return _getLayerFromMetadata({ layer: layer, options: options });
    });
    return {
      config: {
        ...options.config,
        layers: results.map(prop("layer")),
      },
      issues: results.flatMap(prop("issues")),
    };
  },
};
