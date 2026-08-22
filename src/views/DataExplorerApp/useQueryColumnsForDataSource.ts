import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";

import { Model } from "@avandar/models";
import { where } from "@avandar/utils";
import { useMemo } from "react";

import { QueryColumn as QueryColumnFns } from "$/models/queries/QueryColumn/QueryColumn";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";

type Result = {
  /** Every column of the data source, as query columns. */
  columns: QueryColumn.T[];
  isLoading: boolean;
};

/**
 * Loads every column of a data source, whether it is a Dataset or a Concept.
 *
 * Shared by the column multi-select (what the query selects) and the filter
 * panel (what the query can filter on), which are deliberately different
 * choices over the same column list.
 */
export function useQueryColumnsForDataSource(
  dataSourceId: QueryDataSource.TypedId | undefined,
): Result {
  const [datasetColumns, isLoadingDatasetColumns] =
    DatasetColumnClient.useGetAll({
      ...where("dataset_id", "eq", dataSourceId?.id),
      useQueryOptions: {
        enabled: Model.isOfModelType(dataSourceId, "Dataset"),
      },
    });

  const [conceptAttributes, isLoadingConceptAttributes] =
    ConceptAttributeClient.useGetAll({
      ...where("concept_id", "eq", dataSourceId?.id),
      useQueryOptions: {
        enabled: Model.isOfModelType(dataSourceId, "Concept"),
      },
    });

  const columns = useMemo(() => {
    return [
      ...(datasetColumns ?? []).map((column) => {
        return QueryColumnFns.makeFromDatasetColumn(column);
      }),
      ...(conceptAttributes ?? []).map((attribute) => {
        return QueryColumnFns.makeFromConceptAttribute(attribute);
      }),
    ];
  }, [datasetColumns, conceptAttributes]);

  return {
    columns,
    isLoading: isLoadingDatasetColumns || isLoadingConceptAttributes,
  };
}
