import { t } from "@lingui/core/macro";
import { useEffect, useRef } from "react";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { useLocalChatModelCopy } from "@/hooks/localChatModels/useLocalChatModelCopy/useLocalChatModelCopy";
import { useOfflineChatEngineStatus } from "@/hooks/localChatModels/useOfflineChatEngineStatus";
import { TaskProgressStore } from "@/lib/utils/state/TaskProgressStore";
import type { TaskId } from "@/lib/utils/state/TaskProgressStore";

const DO_NOT_CLOSE_TAB_WARNING = t`Do not refresh or close this tab or else the download will be canceled.`;

/**
 * Bridges offline chat model download status into `TaskProgressStore`, so
 * `TaskProgressIndicator` renders it. Renders no markup of its own.
 */
export function OfflineChatDownloadIndicator(): null {
  const getLocalChatModelCopy = useLocalChatModelCopy();
  const status = useOfflineChatEngineStatus();
  const taskIdRef = useRef<TaskId | undefined>(undefined);

  useEffect(() => {
    if (status.kind === "downloading") {
      const model = LocalChatModel.Catalog.find(status.modelId);
      const modelCopy = getLocalChatModelCopy(model);
      const label = t`Downloading ${modelCopy.displayName} for offline chat`;
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
        detail: DO_NOT_CLOSE_TAB_WARNING,
      });
      return;
    }

    if (status.kind === "error") {
      if (taskIdRef.current === undefined) {
        const model = LocalChatModel.Catalog.find(status.modelId);
        const modelCopy = getLocalChatModelCopy(model);
        taskIdRef.current = TaskProgressStore.startTask(
          t`Downloading ${modelCopy.displayName} for offline chat`,
        );
      }
      TaskProgressStore.failTask(taskIdRef.current, status.message);
      taskIdRef.current = undefined;
      return;
    }

    // "ready" or "idle": nothing left to report.
    if (taskIdRef.current !== undefined) {
      TaskProgressStore.finishTask(taskIdRef.current);
      taskIdRef.current = undefined;
    }
  }, [status, getLocalChatModelCopy]);

  return null;
}
