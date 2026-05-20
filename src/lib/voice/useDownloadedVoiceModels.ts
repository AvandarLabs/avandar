import { useCallback, useEffect, useState } from "react";
import { usePlatformInfo } from "@/hooks/usePlatformInfo/usePlatformInfo";
import { useVoiceModelManager } from "./useVoiceModelManager";
import { listModelsForPlatform } from "./voiceModels";
import type { VoiceModelId } from "./voiceModels";

export type DownloadedVoiceModelsState = {
  /** Model ids with weights in local storage (IndexedDB on web). */
  downloadedModelIds: readonly VoiceModelId[];
  /** True when at least one platform-appropriate model is cached locally. */
  hasAnyDownloaded: boolean;
  /** True when `selectedModelId` is cached (if provided). */
  isSelectedModelDownloaded: boolean;
  /** First pass over local cache is still in flight. */
  isChecking: boolean;
  refresh: () => Promise<{
    downloadedModelIds: readonly VoiceModelId[];
    hasAnyDownloaded: boolean;
    isSelectedModelDownloaded: boolean;
  }>;
};

/**
 * Tracks which Whisper models are present in the on-device cache so the UI
 * can enable voice settings while offline or skip the download prompt.
 */
export function useDownloadedVoiceModels(options?: {
  selectedModelId?: VoiceModelId;
}): DownloadedVoiceModelsState {
  const manager = useVoiceModelManager();
  const platform = usePlatformInfo();
  const voicePlatform = platform === "desktop" ? "desktop" : "web";
  const selectedModelId = options?.selectedModelId;

  const [downloadedModelIds, setDownloadedModelIds] = useState<
    readonly VoiceModelId[]
  >([]);
  const [isChecking, setIsChecking] = useState(true);

  const refresh = useCallback(async () => {
    setIsChecking(true);
    try {
      const platformModels = listModelsForPlatform(voicePlatform);
      const downloadChecks = await Promise.all(
        platformModels.map(async (model) => {
          const downloaded = await manager.isModelDownloaded(model.id);
          return { id: model.id, downloaded };
        }),
      );
      const downloadedIds = downloadChecks
        .filter((check) => {
          return check.downloaded;
        })
        .map((check) => {
          return check.id;
        });
      setDownloadedModelIds(downloadedIds);
      const hasAny = downloadedIds.length > 0;
      const selectedReady =
        selectedModelId !== undefined ?
          downloadedIds.includes(selectedModelId)
        : false;
      return {
        downloadedModelIds: downloadedIds,
        hasAnyDownloaded: hasAny,
        isSelectedModelDownloaded: selectedReady,
      };
    } finally {
      setIsChecking(false);
    }
  }, [manager, selectedModelId, voicePlatform]);

  useEffect(() => {
    let cancelled = false;
    void refresh().then(() => {
      if (cancelled) {
        return undefined;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const hasAnyDownloaded = downloadedModelIds.length > 0;
  const isSelectedModelDownloaded =
    selectedModelId !== undefined ?
      downloadedModelIds.includes(selectedModelId)
    : false;

  return {
    downloadedModelIds,
    hasAnyDownloaded,
    isSelectedModelDownloaded,
    isChecking,
    refresh,
  };
}
