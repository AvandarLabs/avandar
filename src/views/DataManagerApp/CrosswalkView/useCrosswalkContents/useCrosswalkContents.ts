import { where } from "@avandar/utils";
import { useMemo } from "react";
import { CrosswalkClient } from "@/clients/crosswalks/CrosswalkClient";
import { CrosswalkColumnClient } from "@/clients/crosswalks/CrosswalkColumnClient";
import { CrosswalkDatasetClient } from "@/clients/crosswalks/CrosswalkDatasetClient";
import { CrosswalkLayoutClient } from "@/clients/crosswalks/CrosswalkLayoutClient";
import { CrosswalkMappingClient } from "@/clients/crosswalks/CrosswalkMappingClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";

/** Where loading a crosswalk stands. */
export type CrosswalkContentsStatus =
  | "loading"
  | "ready"
  | "missing"
  | "failed";

type QueryFacts = {
  data: unknown;
  isFetchedAfterMount: boolean;
  fetchStatus: string;
  isLoadingError: boolean;
};

/**
 * Whether a query holds current data: fetched since this view mounted, or
 * paused on its cached data because the device is offline.
 */
function _isSettled(query: QueryFacts): boolean {
  return (
    query.data !== undefined &&
    (query.isFetchedAfterMount || query.fetchStatus === "paused")
  );
}

/** The five tables' queries for one crosswalk, each refetched on mount. */
function useContentsQueries(crosswalkId: Crosswalk.Id) {
  const options = { useQueryOptions: ALWAYS_REFETCH_ON_MOUNT };
  const ofCrosswalk = {
    ...where("crosswalk_id", "eq", crosswalkId),
    ...options,
  };
  const [crosswalks, , crosswalkQuery] = CrosswalkClient.useGetAll({
    ...where("id", "eq", crosswalkId),
    ...options,
  });
  const [columns, , columnsQuery] =
    CrosswalkColumnClient.useGetAll(ofCrosswalk);
  const [layouts, , layoutsQuery] =
    CrosswalkLayoutClient.useGetAll(ofCrosswalk);
  const [datasets, , datasetsQuery] =
    CrosswalkDatasetClient.useGetAll(ofCrosswalk);
  const [mappings, , mappingsQuery] =
    CrosswalkMappingClient.useGetAll(ofCrosswalk);
  return {
    data: { crosswalks, columns, layouts, datasets, mappings },
    queries: [
      crosswalkQuery,
      columnsQuery,
      layoutsQuery,
      datasetsQuery,
      mappingsQuery,
    ],
  };
}

/**
 * Loads one crosswalk's five tables. `ready` only once every table has
 * fetched since mount (or is paused offline on cached data): the persisted
 * cache can hold a crosswalk from before its last save, and a whole-set
 * save built on that would undo it. A failed background refetch after the
 * data loaded does not count as failed.
 */
export function useCrosswalkContents(crosswalkId: Crosswalk.Id): {
  status: CrosswalkContentsStatus;
  contents: CrosswalkDraft.Contents | undefined;
} {
  const { data, queries } = useContentsQueries(crosswalkId);
  const { crosswalks, columns, layouts, datasets, mappings } = data;
  const contents = useMemo(() => {
    const crosswalk = crosswalks?.[0];
    return crosswalk && columns && layouts && datasets && mappings
      ? { crosswalk, columns, layouts, datasets, mappings }
      : undefined;
  }, [crosswalks, columns, layouts, datasets, mappings]);
  if (
    queries.some((query) => {
      return query.isLoadingError;
    })
  ) {
    return { status: "failed", contents: undefined };
  }
  if (!queries.every(_isSettled)) {
    return { status: "loading", contents: undefined };
  }
  return contents
    ? { status: "ready", contents }
    : { status: "missing", contents: undefined };
}
