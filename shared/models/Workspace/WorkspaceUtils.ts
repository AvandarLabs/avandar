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

    getSeatInfo: ({
      workspace,
      numSeatsInWorkspace,
    }: {
      workspace: WorkspaceWithSubscription;
      numSeatsInWorkspace: number;
    }): {
      usedSeats: number;
      maxSeats: number | undefined;
      isUnlimitedSeats: boolean;
      remainingSeats: number | undefined;
    } => {
      const maxSeats =
        workspace.subscription
          ? SubscriptionModule.getMaxSeatsAllowed(workspace.subscription)
          : undefined;
      const isUnlimitedSeats = maxSeats === Infinity;
      const remainingSeats =
        maxSeats != null && !isUnlimitedSeats
          ? maxSeats - numSeatsInWorkspace
          : undefined;
      return {
        usedSeats: numSeatsInWorkspace,
        maxSeats,
        isUnlimitedSeats,
        remainingSeats,
      };
    },
  },
};
