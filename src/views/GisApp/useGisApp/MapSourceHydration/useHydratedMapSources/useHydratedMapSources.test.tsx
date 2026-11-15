import { Model } from "@avandar/models";
import { identity } from "@avandar/utils";
import { expect, it, vi } from "vitest";
/** Metadata hydration is in-memory and waits for successful metadata. */
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { AvaMapConfigSchema } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigSchema/AvaMapConfigSchema";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { structuredQueryToSql } from "$/models/queries/StructuredQuery/structuredQueryToSql/structuredQueryToSql";
import { TestProviders, renderHook } from "@/test-utils";
import { useHydratedMapSources } from "./useHydratedMapSources";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";

const metadata = vi.hoisted<{ columns: DatasetColumn.T[]; isSuccess: boolean }>(
  () => {
    return { columns: [] as DatasetColumn.T[], isSuccess: false };
  },
);
vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      useGetAll: () => {
        return [metadata.columns, false, { isSuccess: metadata.isSuccess }];
      },
    },
  };
});
vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
  return {
    ConceptAttributeClient: {
      useGetAll: () => {
        return [undefined, false, { isSuccess: false }];
      },
    },
  };
});

it("keeps filters through metadata errors and hydrates without saving", () => {
  const layer = MapLayer.makeEmpty("cases");
  const config = AvaMapConfigSchema.fromJson({
    ...AvaMapConfig.makeEmpty(),
    layers: [
      {
        ...layer,
        source: {
          ...layer.source,
          dataSource: Model.make("Dataset", {
            id: "cases",
            name: "cases",
          }) as Dataset.T,
          filters: {
            type: "group",
            combinator: "AND",
            rules: [
              { type: "rule", columnName: "cnt", operator: ">=", value: 5 },
            ],
          },
        },
      },
    ],
  });
  const editor = {
    name: "map",
    mapConfig: config,
    saveState: "saved" as const,
    updateName: vi.fn(),
    updateConfig:
      vi.fn<(update: (config: AvaMapConfig.T) => AvaMapConfig.T) => void>(),
    saveNow: vi.fn(),
  };
  metadata.isSuccess = false;
  metadata.columns = [];
  const { result, rerender } = renderHook(
    () => {
      return useHydratedMapSources({
        editor: editor,
        workspaceId: "workspace" as Workspace.Id,
      });
    },
    { wrapper: TestProviders },
  );
  expect(result.current.mapConfig.layers[0]?.source.filters).toEqual(
    config.layers[0]?.source.filters,
  );
  metadata.isSuccess = true;
  metadata.columns = [
    Model.make("DatasetColumn", {
      id: "cnt",
      datasetId: "cases",
      name: "cnt",
      dataType: "bigint",
    }) as DatasetColumn.T,
  ];
  rerender();
  expect(
    structuredQueryToSql(result.current.mapConfig.layers[0]!.source),
  ).toContain('where "cnt" >= 5');
  const bound = result.current.mapConfig.layers[0]!.source.filters;
  metadata.isSuccess = false;
  metadata.columns = [];
  rerender();
  expect(result.current.mapConfig.layers[0]?.source.filters).toEqual(bound);
  metadata.isSuccess = true;
  rerender();
  expect(result.current.mapConfig.layers[0]?.source.filters.rules).toEqual([]);
  expect(editor.updateConfig).not.toHaveBeenCalled();
  expect(editor.saveNow).not.toHaveBeenCalled();
  result.current.updateConfig(identity);
  expect(editor.updateConfig.mock.calls.at(-1)?.[0](config)).toBe(config);
});
