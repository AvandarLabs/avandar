import { SubscriptionModule } from "../Subscription/SubscriptionModule.ts";
import { WorkspaceWithSubscription } from "./Workspace.types.ts";

export const WorkspaceUtils = {
  /**
   * Utility functions to determine if a workspace has certain features enabled.
   */
  Features: {
    canAddMoreDatasets: (_options: {
      workspace: WorkspaceWithSubscription;
      numDatasetsInWorkspace: number;
    }): boolean => {
      throw new Error("not implemented");
      /*
      if (!workspace.subscription) {
        return false;
      }

      return !!numDatasetsInWorkspace;
      */
    },

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
      const maxSeatsAllowed = SubscriptionModule.getMaxSeatsAllowed(
        workspace.subscription,
      );
      return numSeatsInWorkspace < maxSeatsAllowed;
    },
  },
};
