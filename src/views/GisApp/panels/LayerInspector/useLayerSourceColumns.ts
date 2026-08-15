import { Model } from "@avandar/models";
import { where } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { useMemo } from "react";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { EntityFieldConfigClient } from "@/clients/entities/EntityFieldConfigClient";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";

/** Returns every column a data source offers as stable `QueryColumn` values. */
export function useLayerSourceColumns(
  dataSourceId: Model.TypedId<QueryDataSource.T> | undefined,
): QueryColumn.T[] {
  const [datasetColumns] = DatasetColumnClient.useGetAll({
    ...where("dataset_id", "eq", dataSourceId?.id),
    useQueryOptions: {
      enabled: Model.isOfModelType(dataSourceId, "Dataset"),
    },
  });

  const [entityFieldConfigs] = EntityFieldConfigClient.useGetAll({
    ...where("entity_config_id", "eq", dataSourceId?.id),
    useQueryOptions: {
      enabled: Model.isOfModelType(dataSourceId, "EntityConfig"),
    },
  });

  return useMemo(() => {
    // QueryColumn builders mint ids, so memoization prevents regenerated ids
    // from repeatedly retriggering the binding-inference effect.
    return [
      ...(datasetColumns ?? []).map((column) => {
        return QueryColumn.makeFromDatasetColumn(column);
      }),
      ...(entityFieldConfigs ?? []).map((field) => {
        return QueryColumn.makeFromEntityFieldConfig(field);
      }),
    ];
  }, [datasetColumns, entityFieldConfigs]);
}
