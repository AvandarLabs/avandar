import { t } from "@lingui/core/macro";
import { useEffect, useRef } from "react";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { useLocalChatModelCopy } from "@/hooks/localChatModels/useLocalChatModelCopy/useLocalChatModelCopy";
import { useOfflineChatEngineStatus } from "@/hooks/localChatModels/useOfflineChatEngineStatus";
import { TaskProgressStore } from "@/lib/utils/state/TaskProgressStore/TaskProgressStore";
import type { TaskId } from "@/lib/utils/state/TaskProgressStore/TaskProgressStore";

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
 * Bridges offline chat model download status into `TaskProgressStore`, so
 * `TaskProgressIndicator` renders it. Pure side-effect wiring: it returns
 * nothing.
 */
export function useOfflineChatDownloadBridge(): void {
  const getLocalChatModelCopy = useLocalChatModelCopy();
  const status = useOfflineChatEngineStatus();
  const taskIdRef = useRef<TaskId | undefined>(undefined);

  useEffect(
    function syncOfflineChatDownloadTask() {
      if (status.kind === "downloading") {
        const label = buildDownloadingLabel(
          status.modelId,
          getLocalChatModelCopy,
        );
        const doNotCloseTabWarning = t`Do not refresh or close this tab or else the download will be canceled.`;
        const percent = Math.round(
          Math.min(1, Math.max(0, status.progress)) * 100,
        );

        if (taskIdRef.current === undefined) {
          taskIdRef.current = TaskProgressStore.startTask(label);
        }
        TaskProgressStore.updateTask(taskIdRef.current, {
          status: "determinate",
          label,
          current: percent,
          total: 100,
          detail: doNotCloseTabWarning,
        });
      } else if (status.kind === "error") {
        if (taskIdRef.current === undefined) {
          taskIdRef.current = TaskProgressStore.startTask(
            buildDownloadingLabel(status.modelId, getLocalChatModelCopy),
          );
        }
        TaskProgressStore.failTask(taskIdRef.current, status.message);
        taskIdRef.current = undefined;
      } else if (taskIdRef.current !== undefined) {
        // "ready" or "idle": nothing left to report.
        TaskProgressStore.finishTask(taskIdRef.current);
        taskIdRef.current = undefined;
      }
    },
    [status, getLocalChatModelCopy],
  );

  // Separate, mount-lifecycle-only effect: finishes any task still tracked
  // when this hook unmounts, so an active download never orphans its entry
  // in the shared `TaskProgressStore`. Kept apart from the status effect
  // above so it does not also fire between status updates.
  useEffect(function finishTrackedTaskOnUnmount() {
    return () => {
      if (taskIdRef.current !== undefined) {
        TaskProgressStore.finishTask(taskIdRef.current);
        taskIdRef.current = undefined;
      }
    };
  }, []);
}
