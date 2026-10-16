/** Saved GIS filters bind against all metadata, not just selected fields. */
import { Model } from "@avandar/models";
import { expect, it } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import { MapSourceHydration } from "./MapSourceHydration";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

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
  expect(
    source.queryColumns.map((column) => {
      return column.baseColumn.name;
    }),
  ).toEqual(["district"]);
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
