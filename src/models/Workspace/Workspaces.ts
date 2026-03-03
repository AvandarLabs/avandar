import { Subscriptions } from "../Subscription/Subscriptions";
import { WorkspaceWithSubscription } from "./Workspace.types";

export const Workspaces = {
  /**
   * Utility functions to determine if a workspace has certain features enabled.
   */
  Features: {
    canInviteMoreUsers: ({
      workspace,
      numSeatsInWorkspace,
    }: {
      workspace: WorkspaceWithSubscription;
      numSeatsInWorkspace: number;
    }): boolean => {
      if (!workspace.subscription) {
        return false;
      }
      const maxSeatsAllowed = Subscriptions.getMaxSeatsAllowed(
        workspace.subscription,
      );
      return numSeatsInWorkspace < maxSeatsAllowed;
    },
  },
};
