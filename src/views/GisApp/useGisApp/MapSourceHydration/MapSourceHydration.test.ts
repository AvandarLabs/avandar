import { Model } from "@avandar/models";
import { prop } from "@avandar/utils";
import { expect, it } from "vitest";
/** Saved GIS filters bind against all metadata, not just selected fields. */
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import { MapSourceHydration } from "./MapSourceHydration";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";

it("keeps an unselected persisted WHERE target through metadata hydration and rename", () => {
  const dataset = Model.make("Dataset", {
    id: "cases",
    name: "cases",
  }) as Dataset.T;
  const columns = ["district", "cnt"].map((name) => {
    return Model.make("DatasetColumn", {
      id: `dc_${name}`,
      datasetId: dataset.id,
      name,
      originalName: name,
      dataType: name === "cnt" ? "bigint" : "varchar",
      columnIdx: 0,
    }) as DatasetColumn.T;
  });
  const layer = MapLayer.makeEmpty("cases");
  const persisted = {
    ...AvaMapConfig.makeEmpty(),
    layers: [
      {
        ...layer,
        source: {
          ...layer.source,
          dataSource: dataset,
          queryColumns: [QueryColumn.makeFromDatasetColumn(columns[0]!)],
          filters: {
            type: "group",
            combinator: "AND",
            rules: [
              {
                type: "rule",
                id: "legacy",
                columnName: "cnt",
                operator: ">=",
                value: 5,
              },
            ],
          },
        },
      },
    ],
  };
  const config = AvaMapConfigSchema.fromJson(persisted);
  const loaded = MapSourceHydration.fromMetadata({
    config,
    datasetColumns: columns,
    conceptAttributes: undefined,
  });
  expect(loaded.issues).toEqual([]);
  const source = loaded.config.layers[0]!.source;
  expect(structuredQueryToSql(source)).toContain('where "cnt" >= 5');
  expect(source.queryColumns.map(prop("baseColumn.name"))).toEqual([
    "district",
  ]);
  const renamed = MapSourceHydration.fromMetadata({
    config,
    previousInput: config,
    previousConfig: loaded.config,
    datasetColumns: columns.map((column) => {
      return column.name === "cnt"
        ? { ...column, name: "count_value" }
        : column;
    }),
    conceptAttributes: undefined,
  });
  expect(structuredQueryToSql(renamed.config.layers[0]!.source)).toContain(
    'where "count_value" >= 5',
  );
});

// A layer saved before the view suffixed a field's column carries no source
// column name. Loading it against current metadata gives it one, so the layer
// keeps reading the field instead of the record key.
it("points a saved case type layer at the view column its renamed field reads", () => {
  const concept = Model.make("Concept", {
    id: "cases",
    name: "Cases",
  }) as Concept.T;
  const attribute = Model.make("ConceptAttribute", {
    id: "attr_key",
    conceptId: concept.id,
    name: "external_id",
    dataType: "varchar",
  }) as ConceptAttribute.T;
  const layer = MapLayer.makeEmpty("cases");
  const config = AvaMapConfigSchema.fromJson({
    ...AvaMapConfig.makeEmpty(),
    layers: [
      {
        ...layer,
        source: {
          ...layer.source,
          dataSource: concept,
          queryColumns: [
            {
              ...QueryColumn.makeFromConceptAttributes([attribute])[0]!,
              sourceColumnName: undefined,
            },
          ],
        },
      },
    ],
  });

  const loaded = MapSourceHydration.fromMetadata({
    config,
    datasetColumns: undefined,
    conceptAttributes: [attribute],
  });

  const source = loaded.config.layers[0]!.source;
  expect(source.queryColumns.map(prop("sourceColumnName"))).toEqual([
    "external_id_2",
  ]);
  expect(structuredQueryToSql(source)).toContain(
    '"external_id_2" as "external_id"',
  );
});

function _makeSchoolsFixture(): {
  config: AvaMapConfig.T;
  columns: DatasetColumn.T[];
} {
  const dataset = Model.make("Dataset", {
    id: "schools",
    name: "schools",
  }) as Dataset.T;
  const columns = ["the_geom", "loc_name", "address"].map((name, index) => {
    return Model.make("DatasetColumn", {
      id: `dc_${name}`,
      datasetId: dataset.id,
      name,
      originalName: name,
      dataType: "varchar",
      columnIdx: index,
    }) as DatasetColumn.T;
  });
  const geometryColumn = QueryColumn.makeFromDatasetColumn(columns[0]!);
  const layer = MapLayer.makeEmpty("schools");
  return {
    columns,
    config: {
      ...AvaMapConfig.makeEmpty(),
      layers: [
        {
          ...layer,
          source: {
            ...layer.source,
            dataSource: dataset,
            queryColumns: [geometryColumn],
          },
          geoBinding: {
            type: "geometryColumn",
            column: geometryColumn.id,
            encoding: "wkt",
            family: "point",
            simplification: undefined,
            sourceCrs: undefined,
          },
        },
      ],
    },
  };
}

it("keeps a geometry layer's saved query columns, so a save never widens them", () => {
  const { config, columns } = _makeSchoolsFixture();

  const loaded = MapSourceHydration.fromMetadata({
    config,
    datasetColumns: columns,
    conceptAttributes: undefined,
  });

  const source = loaded.config.layers[0]!.source;
  expect(source.queryColumns.map(prop("baseColumn.name"))).toEqual([
    "the_geom",
  ]);
  expect(source.sourceColumns?.map(prop("baseColumn.name"))).toEqual([
    "the_geom",
    "loc_name",
    "address",
  ]);
});
