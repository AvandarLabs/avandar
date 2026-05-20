import { useCallback, useEffect, useState } from "react";
import { listModelsForPlatform } from "@/lib/voice/voiceModels";
import { useWhisperCppVoiceModelManager } from "./useWhisperCppVoiceModelManager";
import type { VoiceModelId } from "@/lib/voice/voiceModels";

export type DownloadedWhisperCppVoiceModelsState = {
  downloadedModelIds: readonly VoiceModelId[];
  hasAnyDownloaded: boolean;
  isSelectedModelDownloaded: boolean;
  isChecking: boolean;
  refresh: () => Promise<{
    downloadedModelIds: readonly VoiceModelId[];
    hasAnyDownloaded: boolean;
    isSelectedModelDownloaded: boolean;
  }>;
};

/** Tracks ggml models cached for the whisper.cpp WASM pipeline. */
export function useDownloadedWhisperCppVoiceModels(options?: {
  selectedModelId?: VoiceModelId;
}): DownloadedWhisperCppVoiceModelsState {
  const manager = useWhisperCppVoiceModelManager();
  const selectedModelId = options?.selectedModelId;
  const platformModels = listModelsForPlatform("web");

  const [downloadedModelIds, setDownloadedModelIds] = useState<
    readonly VoiceModelId[]
  >([]);
  const [isChecking, setIsChecking] = useState(true);

  const refresh = useCallback(async () => {
    setIsChecking(true);
    try {
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
  }, [manager, platformModels, selectedModelId]);

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
