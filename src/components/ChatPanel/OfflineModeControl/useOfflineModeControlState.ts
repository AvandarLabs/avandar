import { useIsOfflineBundleDownloaded } from "@/hooks/localChatModels/useIsOfflineBundleDownloaded";
import { useIsOfflineModeOn } from "@/hooks/localChatModels/useIsOfflineModeOn";
import { useOfflineChatEngineStatus } from "@/hooks/localChatModels/useOfflineChatEngineStatus";
import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";
import { isOfflineChatMockForced } from "@/stores/OfflineChatEngineStore/createLocalModelRuntime/isOfflineChatMockForced";

/**
 * What the offline mode control shows:
 * - `unsupported`: this browser has no WebGPU, so offline models cannot run.
 * - `not_downloaded`: the control opens the dialog to download them.
 * - `downloading` and `removing`: busy, not clickable.
 * - `ready`: the control toggles offline mode. `isBrowserOffline` means chat
 *   is already running offline because the connection dropped.
 */
export type OfflineModeControlState =
  | { kind: "unsupported" }
  | { kind: "not_downloaded" }
  | { kind: "downloading"; progress: number }
  | { kind: "removing" }
  | { kind: "ready"; isOn: boolean; isBrowserOffline: boolean };

function _isWebGpuAvailable(): boolean {
  return isOfflineChatMockForced() || "gpu" in navigator;
}

/** The offline mode control's state, kept current as each input changes. */
export function useOfflineModeControlState(): OfflineModeControlState {
  const engineStatus = useOfflineChatEngineStatus();
  const isBundleDownloaded = useIsOfflineBundleDownloaded();
  const isOfflineModeOn = useIsOfflineModeOn();
  const isOnline = useIsOnline();

  if (!_isWebGpuAvailable()) {
    return { kind: "unsupported" };
  }
  if (engineStatus.kind === "downloading") {
    return { kind: "downloading", progress: engineStatus.progress };
  }
  if (engineStatus.kind === "removing") {
    return { kind: "removing" };
  }
  if (!isBundleDownloaded) {
    return { kind: "not_downloaded" };
  }
  return { kind: "ready", isOn: isOfflineModeOn, isBrowserOffline: !isOnline };
}
