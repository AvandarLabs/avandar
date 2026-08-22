import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { RefObject } from "react";

import { useEffect, useState } from "react";

/**
 * Leaves fetched per `getClusterLeaves` call. Kept small so a request
 * against a cluster holding hundreds of thousands of points stays cheap.
 */
export const CLUSTER_LEAVES_PAGE_SIZE = 50;

/** One page of a cluster's member features, or its loading/error state. */
export type ClusterLeavesPage =
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "success"; leaves: GeoJSON.Feature[] };

/** Requests one page of a cluster's leaves from its live MapLibre source. */
function _getClusterLeavesPage(
  options: Readonly<{
    map: MapLibreMap | undefined;
    sourceId: string;
    clusterId: number;
    page: number;
  }>,
): Promise<GeoJSON.Feature[]> {
  const source = options.map?.getSource<GeoJSONSource>(options.sourceId);
  if (!source || !("getClusterLeaves" in source)) {
    return Promise.reject(
      new Error(`Cluster source "${options.sourceId}" is not available.`),
    );
  }
  const offset = (options.page - 1) * CLUSTER_LEAVES_PAGE_SIZE;
  return source.getClusterLeaves(
    options.clusterId,
    CLUSTER_LEAVES_PAGE_SIZE,
    offset,
  );
}

/**
 * Fetches one page of a cluster's member features.
 *
 * A response is only applied if the cluster and page it was requested for
 * are still the current ones: changing either reruns this effect, and the
 * cleanup from the previous run flags its in-flight promise as stale so an
 * out-of-order response can never overwrite a newer selection.
 */
export function useClusterLeavesPage(
  options: Readonly<{
    mapRef: RefObject<MapLibreMap | undefined>;
    sourceId: string;
    clusterId: number;
    page: number;
  }>,
): ClusterLeavesPage {
  const { mapRef, sourceId, clusterId, page } = options;
  const [pageState, setPageState] = useState<ClusterLeavesPage>({
    status: "loading",
  });

  useEffect(
    function fetchClusterLeavesPage() {
      let isStale = false;
      setPageState({ status: "loading" });
      _getClusterLeavesPage({ map: mapRef.current, sourceId, clusterId, page })
        .then((leaves) => {
          if (!isStale) {
            setPageState({ status: "success", leaves });
          }
        })
        .catch((error: unknown) => {
          if (!isStale) {
            setPageState({ status: "error", error });
          }
        });
      return () => {
        isStale = true;
      };
    },
    [mapRef, sourceId, clusterId, page],
  );

  return pageState;
}
