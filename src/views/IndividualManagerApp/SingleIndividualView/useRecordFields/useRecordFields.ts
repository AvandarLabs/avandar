import { where } from "@avandar/utils";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { ConceptRecordValuesClient } from "@/clients/ontology/ConceptRecordValuesClient/ConceptRecordValuesClient";
import { removeDuplicates } from "@/lib/utils/arrays/removeDuplicates/removeDuplicates";
import { makeCaseDetailsRowsFromAttributes } from "@/views/IndividualManagerApp/SingleIndividualView/useRecordFields/makeCaseDetailsRowsFromAttributes/makeCaseDetailsRowsFromAttributes";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { AttributeMapping } from "$/models/ontology/AttributeMapping/AttributeMapping.types";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
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

/** The fields' mappings and the datasets they name, for the source lines. */
type SourceDatasets = {
  mappings: readonly AttributeMapping[];
  datasets: readonly Dataset.T[];
};

/** The parts of a query result that a load failure and its retry read. */
type RetryableRead = {
  isError: boolean;
  isRefetching: boolean;
  refetch: () => Promise<unknown>;
};

/**
 * Reads the fields' mappings and the datasets they name. Returns `undefined`
 * while either read is in flight, so the source lines arrive with the values.
 * A failed read gives empty lists, and the fields then show without sources.
 */
function _useSourceDatasets(
  attributes: readonly ConceptAttribute.T[] | undefined,
): SourceDatasets | undefined {
  const [mappings, , mappingsQuery] =
    ConceptAttributeClient.useGetAllAttributeMappings({ attributes });
  const datasetIds = useMemo(() => {
    return removeDuplicates(
      (mappings ?? []).flatMap((mapping) => {
        return mapping.type === "dataset_column" ? [mapping.datasetId] : [];
      }),
    );
  }, [mappings]);
  const [datasets, , datasetsQuery] = DatasetClient.useGetAll(
    where("id", "in", datasetIds),
  );

  return useMemo(() => {
    if (mappingsQuery.isError) {
      return { mappings: [], datasets: [] };
    }
    if (mappings === undefined) {
      return undefined;
    }
    if (datasetsQuery.isError) {
      return { mappings, datasets: [] };
    }
    return datasets === undefined ? undefined : { mappings, datasets };
  }, [mappings, mappingsQuery.isError, datasets, datasetsQuery.isError]);
}

/**
 * The load failure state of the given reads. Only a failed read counts
 * towards `isRetrying`, so a background refresh of a read that succeeded
 * does not show as a retry, and `retry` reads again only the failed ones.
 */
function _getLoadState(
  reads: readonly RetryableRead[],
): Pick<RecordFields, "isLoadError" | "isRetrying" | "retry"> {
  const failedReads = reads.filter((read) => {
    return read.isError;
  });
  return {
    isLoadError: failedReads.length > 0,
    isRetrying: failedReads.some((read) => {
      return read.isRefetching;
    }),
    retry: () => {
      failedReads.forEach((read) => {
        void read.refetch();
      });
    },
  };
}

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
  const sourceDatasets = _useSourceDatasets(attributes);
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
    if (recordValues === undefined || sourceDatasets === undefined) {
      return undefined;
    }
    return makeCaseDetailsRowsFromAttributes({
      attributes,
      valuesByAttributeId: recordValues[0]?.valuesByAttributeId ?? {},
      mappings: sourceDatasets.mappings,
      datasets: sourceDatasets.datasets,
    });
  }, [attributes, recordValues, sourceDatasets]);

  return { rows, ..._getLoadState([attributesQuery, valuesQuery]) };
}
