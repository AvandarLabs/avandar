import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { serializeDataExplorerStateToUrl } from "@/views/DataExplorerApp/serializeDataExplorerStateToUrl/serializeDataExplorerStateToUrl";
import {
  DataExplorerUrlState,
  useHydrateDataExplorerStateFromUrl,
} from "./useHydrateDataExplorerStateFromUrl";

/**
 * Manages two-way sync between the Data Explorer's in-memory state and the
 * URL search params:
 *
 * - **Hydration (URL → state):** On first mount, if the store is still at
 *   its default empty state, the hook restores data source, column
 *   selections, aggregations, order-by, raw SQL, and viz config from the URL
 *   params. If `sql` is present in the URL, only raw SQL (plus viz / open
 *   dataset) is applied — `ds` and `cols` are ignored so a stale Manual Query
 *   cannot block restore or conflict with the SQL text. Column objects are
 *   re-fetched via TanStack Query (cached) and matched by
 *   `baseColumn.name` when structured params are used.
 *
 * - **Persistence (state → URL):** After hydration is complete, every state
 *   change is serialised back to the URL using `replace: true` so the browser
 *   history stays clean.
 */
export function useDataExplorerUrlSync({
  initialUrlState,
}: {
  initialUrlState: DataExplorerUrlState;
}): void {
  const navigate = useNavigate({ from: "/$workspaceSlug/data-explorer" });
  const appState = DataExplorerStateManager.useState();
  const { isHydrated } = useHydrateDataExplorerStateFromUrl({
    initialUrlState,
  });

  // Sync state → URL on every state change, after hydration completes.
  const lastSyncedRef = useRef<string | undefined>(undefined);

  useEffect(
    function writeAppStateToUrl() {
      if (isHydrated) {
        const urlParams = serializeDataExplorerStateToUrl(appState);
        const urlStringParams = JSON.stringify(urlParams);
        if (urlStringParams === lastSyncedRef.current) {
          return;
        }
        lastSyncedRef.current = urlStringParams;
        navigate({ search: urlParams, replace: true });
      }
    },
    [isHydrated, appState, navigate],
  );
}
