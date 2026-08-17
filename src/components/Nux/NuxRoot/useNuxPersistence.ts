import { useEffect, useRef } from "react";
import { NuxProgressClient } from "@/clients/NuxProgressClient";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";

/**
 * Writes status and completed milestones back whenever they change.
 *
 * Writes are compared against the last value this hook itself wrote rather
 * than fired on every render, so expanding the panel or stepping through
 * tooltips costs nothing. Step index is deliberately never persisted.
 */
export function useNuxPersistence(): void {
  const state = NuxStateManager.useState();
  const lastWrittenRef = useRef<string | undefined>(undefined);

  useEffect(
    function persistNuxProgress() {
      if (!state.isHydrated || !state.progressId || !state.status) {
        return;
      }
      const signature = JSON.stringify({
        status: state.status,
        completedMilestones: state.completedMilestones,
      });
      if (lastWrittenRef.current === undefined) {
        // The first pass records what hydration already put in the database,
        // so a fresh mount does not write a row identical to the one it read.
        lastWrittenRef.current = signature;
        return;
      }
      if (lastWrittenRef.current === signature) {
        return;
      }
      lastWrittenRef.current = signature;
      void NuxProgressClient.updateProgress({
        progressId: state.progressId,
        data: {
          status: state.status,
          completedMilestones: state.completedMilestones,
        },
      }).catch(() => {
        // Losing a write costs at most a replayed milestone. It must never
        // interrupt what the user is doing.
      });
    },
    [
      state.isHydrated,
      state.progressId,
      state.status,
      state.completedMilestones,
    ],
  );
}
