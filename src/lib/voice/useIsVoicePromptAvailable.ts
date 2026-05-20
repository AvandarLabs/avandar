import { useIsOnline } from "@/lib/offline/useIsOnline";
import { useDownloadedVoiceModels } from "./useDownloadedVoiceModels";

/**
 * Whether the user can open voice settings or dictate: always when online
 * (download may still be required), and when offline only if a model is
 * already in the local cache.
 */
export function useIsVoicePromptAvailable(): {
  isAvailable: boolean;
  isChecking: boolean;
  hasAnyDownloaded: boolean;
} {
  const isOnline = useIsOnline();
  const { hasAnyDownloaded, isChecking } = useDownloadedVoiceModels();

  return {
    isAvailable: isOnline || hasAnyDownloaded,
    isChecking,
    hasAnyDownloaded,
  };
}
