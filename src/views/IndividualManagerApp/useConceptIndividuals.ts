import { prop, where } from "@avandar/utils";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Individual } from "$/models/ontology/Individual/Individual";

const PAGE_SIZE = 20;

type ConceptIndividualsPage = {
  allIndividuals: Individual.T[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  fetchNextPage: () => unknown;
};

/**
 * Paginates records for one case type. Shares the IndividualClient query
 * key with the records list pane.
 */
export function useConceptIndividuals(
  conceptId: Concept.Id,
): ConceptIndividualsPage {
  const query = useInfiniteQuery({
    queryKey: IndividualClient.QueryKeys.getAll(
      where("concept_id", "eq", conceptId),
    ),
    queryFn: (ctx) => {
      return IndividualClient.getPage({
        pageSize: PAGE_SIZE,
        pageNum: ctx.pageParam,
        ...where("concept_id", "eq", conceptId),
      });
    },
    getNextPageParam: (lastPage) => {
      return lastPage.nextPage;
    },
    initialPageParam: 0,
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
