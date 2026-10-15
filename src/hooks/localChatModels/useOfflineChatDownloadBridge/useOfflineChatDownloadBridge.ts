import { t } from "@lingui/core/macro";
import { useEffect, useRef } from "react";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { useLocalChatModelCopy } from "@/hooks/localChatModels/useLocalChatModelCopy/useLocalChatModelCopy";
import { useOfflineChatEngineStatus } from "@/hooks/localChatModels/useOfflineChatEngineStatus";
import { JobProgressStore } from "@/lib/utils/state/JobProgressStore/JobProgressStore";
import type { JobId } from "@/lib/utils/state/JobProgressStore/JobProgressStore";

/**
 * Looks up the catalog entry and localized copy for `modelId`, and builds
 * the label shown while that model downloads for offline chat. Shared by
 * the "downloading" and "error" branches of
 * {@link useOfflineChatDownloadBridge}'s sync effect.
 */
function buildDownloadingLabel(
  modelId: LocalChatModel.Id,
  getLocalChatModelCopy: (model: LocalChatModel.T) => LocalChatModel.Copy,
): string {
  const model = LocalChatModel.Catalog.find(modelId);
  const modelCopy = getLocalChatModelCopy(model);
  return t`Downloading ${modelCopy.displayName} for offline chat`;
}

/**
 * Bridges offline chat model download status into `JobProgressStore`, so
 * `JobProgressIndicator` renders it. Pure side-effect wiring: it returns
 * nothing.
 */
export function useOfflineChatDownloadBridge(): void {
  const getLocalChatModelCopy = useLocalChatModelCopy();
  const status = useOfflineChatEngineStatus();
  const jobIdRef = useRef<JobId | undefined>(undefined);

  useEffect(
    function syncOfflineChatDownloadJob() {
      if (status.kind === "downloading") {
        const label = buildDownloadingLabel(
          status.modelId,
          getLocalChatModelCopy,
        );
        const doNotCloseTabWarning = t`Do not refresh or close this tab or else the download will be canceled.`;
        const percent = Math.round(
          Math.min(1, Math.max(0, status.progress)) * 100,
        );

        if (jobIdRef.current === undefined) {
          jobIdRef.current = JobProgressStore.startJob(label);
        }
        JobProgressStore.updateJob(jobIdRef.current, {
          status: "determinate",
          label,
          current: percent,
          total: 100,
          detail: doNotCloseTabWarning,
        });
      } else if (status.kind === "error") {
        if (jobIdRef.current === undefined) {
          jobIdRef.current = JobProgressStore.startJob(
            buildDownloadingLabel(status.modelId, getLocalChatModelCopy),
          );
        }
        JobProgressStore.failJob(jobIdRef.current, status.message);
        jobIdRef.current = undefined;
      } else if (jobIdRef.current !== undefined) {
        // "ready" or "idle": nothing left to report.
        JobProgressStore.finishJob(jobIdRef.current);
        jobIdRef.current = undefined;
      }
    },
    [status, getLocalChatModelCopy],
  );

  // Separate, mount-lifecycle-only effect: finishes any job still tracked
  // when this hook unmounts, so an active download never orphans its entry
  // in the shared `JobProgressStore`. Kept apart from the status effect
  // above so it does not also fire between status updates.
  useEffect(function finishTrackedJobOnUnmount() {
    return () => {
      if (jobIdRef.current !== undefined) {
        JobProgressStore.finishJob(jobIdRef.current);
        jobIdRef.current = undefined;
      }
    };
  }, []);
}
