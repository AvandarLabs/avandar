import { where } from "@avandar/utils";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { ConceptRecordValuesClient } from "@/clients/ontology/ConceptRecordValuesClient/ConceptRecordValuesClient";
import { removeDuplicates } from "@/lib/utils/arrays/removeDuplicates/removeDuplicates";
import { makeCaseDetailsRowsFromAttributes } from "@/views/IndividualManagerApp/SingleIndividualView/useRecordFields/makeCaseDetailsRowsFromAttributes/makeCaseDetailsRowsFromAttributes";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { CaseDetailsRow } from "@/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail";

/** A record's fields as the record page shows them, and their load state. */
export type RecordFields = {
  /** One row per field, in name order, or `undefined` while they load. */
  rows: CaseDetailsRow[] | undefined;
  /** Whether the fields or the record's values failed to load. */
  isLoadError: boolean;
  /** Whether a retry after a failure is in flight. */
  isRetrying: boolean;
  /** Reads again whichever of the two failed. */
  retry: () => void;
};

/**
 * Reads one record's fields for the record page: the case type's fields, the
 * record's values from the concept view, and each field's source datasets
 * from its mappings. Used by `SingleIndividualView` to fill `CaseDetailsRail`.
 */
export function useRecordFields(
  options: Readonly<{ concept: Concept.T; individual: Individual.T }>,
): RecordFields {
  const { concept, individual } = options;
  const [attributes, , attributesQuery] = ConceptAttributeClient.useGetAll(
    where("concept_id", "eq", concept.id),
  );
  const [mappings] = ConceptAttributeClient.useGetAllAttributeMappings({
    attributes,
  });
  const datasetIds = useMemo(() => {
    return removeDuplicates(
      (mappings ?? []).flatMap((mapping) => {
        return mapping.type === "dataset_column" ? [mapping.datasetId] : [];
      }),
    );
  }, [mappings]);
  const [datasets] = DatasetClient.useGetAll(where("id", "in", datasetIds));
  // A case type with no fields has nothing to compute, so it starts no
  // DuckDB query.
  const [recordValues, , valuesQuery] =
    ConceptRecordValuesClient.useGetConceptRecordValues({
      workspaceId: individual.workspaceId,
      conceptId: concept.id,
      externalIds: [individual.externalId],
      useQueryOptions: {
        enabled: attributes !== undefined && attributes.length > 0,
      },
    });

  const rows = useMemo(() => {
    if (attributes === undefined) {
      return undefined;
    }
    if (attributes.length === 0) {
      return [];
    }
    if (recordValues === undefined) {
      return undefined;
    }
    return makeCaseDetailsRowsFromAttributes({
      attributes,
      valuesByAttributeId: recordValues[0]?.valuesByAttributeId ?? {},
      mappings: mappings ?? [],
      datasets: datasets ?? [],
    });
  }, [attributes, recordValues, mappings, datasets]);

  return {
    rows,
    isLoadError: attributesQuery.isError || valuesQuery.isError,
    isRetrying: attributesQuery.isRefetching || valuesQuery.isRefetching,
    retry: () => {
      if (attributesQuery.isError) {
        void attributesQuery.refetch();
      }
      if (valuesQuery.isError) {
        void valuesQuery.refetch();
      }
    },
  };
}
