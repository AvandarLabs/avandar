import { prop } from "@avandar/utils";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

const PAGE_SIZE = 20;

type AssignedRecordsPage = {
  records: Individual.T[];
  hasNextPage: boolean;
  isLoading: boolean;
  isError: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
  refetch: () => unknown;
};

/**
 * Pages through every record assigned to a user in one workspace, across case
 * types.
 *
 * Rows come ordered by case type, then name, then id. The id keeps two
 * records with the same name from swapping places across pages. The query key
 * is the `getAll` key of the `assigned_to` and `workspace_id` filter, so
 * saving an assignment finds this queue through the key the save already
 * invalidates. The query waits until the user is known.
 *
 * @param userId The signed-in user. `undefined` disables the query.
 * @param workspaceId The workspace whose records are listed. A person in two
 * workspaces never sees the other one's records.
 */
export function useAssignedRecords(
  userId: User.Id | undefined,
  workspaceId: Workspace.Id,
): AssignedRecordsPage {
  const assignedWhere = {
    assigned_to: { eq: userId },
    workspace_id: { eq: workspaceId },
  };
  const query = useInfiniteQuery({
    queryKey: IndividualClient.QueryKeys.getAll({
      where: assignedWhere,
    }),
    queryFn: (ctx) => {
      return IndividualClient.getPage({
        where: assignedWhere,
        orderBy: [
          { column: "concept_id", direction: "asc" },
          { column: "name", direction: "asc" },
          { column: "id", direction: "asc" },
        ],
        pageSize: PAGE_SIZE,
        pageNum: ctx.pageParam,
      });
    },
    enabled: userId !== undefined,
    getNextPageParam: (lastPage) => {
      return lastPage.nextPage;
    },
    initialPageParam: 0,
    placeholderData: keepPreviousData,
  });

  const records = useMemo(() => {
    return query.data ? query.data.pages.flatMap(prop("rows")) : [];
  }, [query.data]);

  return {
    records,
    hasNextPage: query.hasNextPage,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
