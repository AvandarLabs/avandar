import { Model } from "@avandar/models";
import { where } from "@avandar/utils";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { useMemo } from "react";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
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

  const [conceptAttributes] = ConceptAttributeClient.useGetAll({
    ...where("concept_id", "eq", dataSourceId?.id),
    useQueryOptions: {
      enabled: Model.isOfModelType(dataSourceId, "Concept"),
    },
  });

  return useMemo(() => {
    // QueryColumn builders mint ids, so memoization prevents regenerated ids
    // from repeatedly retriggering the binding-inference effect.
    return [
      ...(datasetColumns ?? []).map((column) => {
        return QueryColumn.makeFromDatasetColumn(column);
      }),
      ...(conceptAttributes ?? []).map((attribute) => {
        return QueryColumn.makeFromConceptAttribute(attribute);
      }),
    ];
  }, [datasetColumns, conceptAttributes]);
}
