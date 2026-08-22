import { useMemo, useSyncExternalStore } from "react";
import { NuxStepFactsStore } from "@/components/Nux/NuxTour/NuxStepFactsStore/NuxStepFactsStore";
import type { NuxStepFacts } from "@/components/Nux/tutorials/NuxTutorial.types";

/** Live explorer facts for the open tutorial's `when` conditions. */
export function useNuxStepFacts(): NuxStepFacts {
  const explorerHasQueryResults = useSyncExternalStore(
    NuxStepFactsStore.subscribe,
    NuxStepFactsStore.getExplorerHasQueryResults,
    () => {
      return false;
    },
  );
  const generalAccessIsWorkspace = useSyncExternalStore(
    NuxStepFactsStore.subscribe,
    NuxStepFactsStore.getGeneralAccessIsWorkspace,
    () => {
      return false;
    },
  );
  return useMemo(() => {
    return { explorerHasQueryResults, generalAccessIsWorkspace };
  }, [explorerHasQueryResults, generalAccessIsWorkspace]);
}
