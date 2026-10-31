import { Model } from "@avandar/models";
import { where } from "@avandar/utils";
import { useMemo } from "react";
import { match } from "ts-pattern";
import { QueryColumn as QueryColumnFns } from "$/models/queries/QueryColumn/QueryColumn";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";

type Result = {
  /** Every column of the data source, as query columns. */
  columns: QueryColumn.T[];
  isLoading: boolean;
  /** True after a successful active query, or when no source is selected. */
  isReady: boolean;
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
  const [datasetColumns, isLoadingDatasetColumns, datasetQuery] =
    DatasetColumnClient.useGetAll({
      ...where("dataset_id", "eq", dataSourceId?.id),
      useQueryOptions: {
        enabled: Model.isOfModelType(dataSourceId, "Dataset"),
      },
    });

  const [conceptAttributes, isLoadingConceptAttributes, conceptQuery] =
    ConceptAttributeClient.useGetAll({
      ...where("concept_id", "eq", dataSourceId?.id),
      useQueryOptions: {
        enabled: Model.isOfModelType(dataSourceId, "Concept"),
      },
    });

  const sourceType = dataSourceId?.__type;
  const sourceId = dataSourceId?.id;
  const columns = useMemo(() => {
    if (!sourceId) {
      return [];
    }
    return [
      ...(sourceType === "Dataset" ? (datasetColumns ?? []) : []).map(
        (column) => {
          return QueryColumnFns.makeFromDatasetColumn(column);
        },
      ),
      ...(sourceType === "Concept" ? (conceptAttributes ?? []) : []).map(
        (attribute) => {
          return QueryColumnFns.makeFromConceptAttribute(attribute);
        },
      ),
    ];
  }, [datasetColumns, conceptAttributes, sourceType, sourceId]);

  return {
    columns,
    ...match(sourceType)
      .with("Dataset", () => {
        return {
          isReady: datasetQuery.isSuccess,
          isLoading: isLoadingDatasetColumns,
        };
      })
      .with("Concept", () => {
        return {
          isReady: conceptQuery.isSuccess,
          isLoading: isLoadingConceptAttributes,
        };
      })
      .with(undefined, () => {
        return { isReady: true, isLoading: false };
      })
      .exhaustive(),
  };
}
