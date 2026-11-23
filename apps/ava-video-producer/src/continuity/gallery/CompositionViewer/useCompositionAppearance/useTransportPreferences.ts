import { useEffect } from "react";
import type { CompositionTransport } from "../getCompositionTransportUpdates";
/**
 * Persist and send playback preferences without failing unavailable storage.
 */
export function useTransportPreferences({
  transport,
  send,
}: Readonly<{
  transport: CompositionTransport;
  send: (action: string, value?: unknown) => void;
}>): void {
  useEffect(
    function persistAndSendTransportOptions() {
      send("speed", transport.speed);
      send("loop", transport.loop);
      try {
        localStorage.setItem(
          "composition-transport",
          JSON.stringify(transport),
        );
      } catch {
        // Preferences remain usable when storage is unavailable.
      }
    },
    [transport, send],
  );
}
