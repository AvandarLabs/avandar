import { prop } from "@avandar/utils";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { makeRecordsWhereFromStatusFilter } from "@/views/IndividualManagerApp/makeRecordsWhereFromStatusFilter/makeRecordsWhereFromStatusFilter";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Individual } from "$/models/ontology/Individual/Individual";

const PAGE_SIZE = 20;

const NO_STATUS_IDS: readonly ConceptStatus.Id[] = [];

type ConceptIndividualsPage = {
  allIndividuals: Individual.T[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  fetchNextPage: () => unknown;
};

/**
 * Pages through one case type's records, narrowed to the given statuses when
 * any are given.
 *
 * The query key is the `getAll` key of the filter the records count also
 * uses, so the chosen statuses are part of the key, and a status change finds
 * every list of the case type by its `concept_id`. While a new filter loads,
 * the previous rows stay on screen rather than flashing to a loader.
 *
 * @param options.conceptId The case type.
 * @param options.statusIds The chosen statuses. Empty or unset means all.
 */
export function useConceptIndividuals(
  options: Readonly<{
    conceptId: Concept.Id;
    statusIds?: readonly ConceptStatus.Id[];
  }>,
): ConceptIndividualsPage {
  const { conceptId, statusIds = NO_STATUS_IDS } = options;
  const recordsWhere = makeRecordsWhereFromStatusFilter({
    conceptId,
    statusIds,
  });
  const query = useInfiniteQuery({
    queryKey: IndividualClient.QueryKeys.getAll(recordsWhere),
    queryFn: (ctx) => {
      return IndividualClient.getPage({
        pageSize: PAGE_SIZE,
        pageNum: ctx.pageParam,
        ...recordsWhere,
      });
    },
    getNextPageParam: (lastPage) => {
      return lastPage.nextPage;
    },
    initialPageParam: 0,
    placeholderData: keepPreviousData,
  });

  const allIndividuals = useMemo(() => {
    return query.data ? query.data.pages.flatMap(prop("rows")) : [];
  }, [query.data]);

  return {
    allIndividuals,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    fetchNextPage: query.fetchNextPage,
  };
}
