import { createAppStateManager } from "@/lib/utils/state/createAppStateManager/createAppStateManager";
import { INITIAL_NUX_STATE } from "@/components/Nux/NuxStateManager/NuxAppState.types";
import { nuxActions } from "@/components/Nux/NuxStateManager/nuxActions";

/**
 * Runtime state for the onboarding tutorial.
 *
 * Mounted once per workspace in `WorkspaceLayoutContents`, above the router
 * outlet, so a route change never loses the active milestone. The transitions
 * themselves live in `nuxActions.ts` and are tested there.
 */
export const NuxStateManager = createAppStateManager({
  name: "Nux",
  initialState: INITIAL_NUX_STATE,
  actions: nuxActions,
});
