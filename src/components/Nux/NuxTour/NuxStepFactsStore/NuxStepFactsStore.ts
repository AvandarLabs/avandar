import { createExternalStore } from "@/lib/utils/state/createExternalStore";
import type { NuxStepFacts } from "@/components/Nux/tutorials/NuxTutorial.types";

/**
 * Live facts the tutorial's `when` conditions read.
 *
 * Published from the Data Explorer (savable query results) and the share
 * modal (whether General access is workspace).
 */
export const NuxStepFactsStore = createExternalStore({
  initialState: {
    explorerHasQueryResults: false,
    generalAccessIsWorkspace: false,
  },
  builder: (state: NuxStepFacts) => {
    return {
      getters: {
        getFacts: (): NuxStepFacts => {
          return {
            explorerHasQueryResults: state.explorerHasQueryResults,
            generalAccessIsWorkspace: state.generalAccessIsWorkspace,
          };
        },
        getExplorerHasQueryResults: (): boolean => {
          return state.explorerHasQueryResults;
        },
        getGeneralAccessIsWorkspace: (): boolean => {
          return state.generalAccessIsWorkspace;
        },
      },
      updaters: {
        setExplorerHasQueryResults: (
          explorerHasQueryResults: boolean,
        ): void => {
          state.explorerHasQueryResults = explorerHasQueryResults;
        },
        setGeneralAccessIsWorkspace: (
          generalAccessIsWorkspace: boolean,
        ): void => {
          state.generalAccessIsWorkspace = generalAccessIsWorkspace;
        },
      },
    };
  },
});
