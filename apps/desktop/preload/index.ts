/// <reference lib="dom" />

declare global {
  interface Window {
    __AVA_PLATFORM__: "desktop";
    /*
     * Electrobun installs `__electrobun.rpc` on the preload world's
     * window so we can reach the cross-process RPC stream. Treat it as
     * `unknown` here; the bridge below casts at the call sites.
     */
    __electrobun?: unknown;
  }
}

(window as Window).__AVA_PLATFORM__ = "desktop";

/*
 * Preload IPC bridge.
 *
 * The page main world (where React runs) cannot reach Electrobun's RPC
 * directly: user-defined preload globals don't cross the content-world
 * boundary. So `apps/desktop/main/ipc/desktopIpcBridgeScript` installs a
 * thin `window.electrobun = { send, once }` into the page world via
 * `webview.executeJavascript`, and that shim talks to the preload world
 * by dispatching DOM `CustomEvent`s on `document` (DOM is shared even
 * when JS globals aren't).
 *
 * This module's job is the preload half: catch the page world's
 * `ava-ipc-out` events and forward them to bun-main via Electrobun's
 * RPC, and listen for bun-main's RPC messages and dispatch matching
 * `ava-ipc-in` events back to the page world.
 *
 * The whole bridge is end-to-end-untested at the time of writing —
 * runtime verification requires `pnpm dev:desktop` plus a round-trip
 * call (e.g. signing in via the desktop auth provider).
 */

type ElectrobunPreloadRpc = {
  send: Record<string, (payload: unknown) => void>;
  addMessageListener: (
    name: "*",
    listener: (name: string, payload: unknown) => void,
  ) => void;
};

function getPreloadRpc(): ElectrobunPreloadRpc | null {
  const electrobunGlobal = (window as { __electrobun?: { rpc?: unknown } })
    .__electrobun;
  if (electrobunGlobal === undefined || electrobunGlobal === null) {
    return null;
  }
  const rpc = electrobunGlobal.rpc;
  if (rpc === undefined || rpc === null) {
    return null;
  }
  return rpc as ElectrobunPreloadRpc;
}

type OutboundDetail = { channel: string; message: unknown };

function installIpcBridge(): void {
  const rpc = getPreloadRpc();
  if (rpc === null) {
    // Electrobun hasn't initialised its RPC yet. Try again on the next
    // frame; the bridge is best-effort during boot.
    requestAnimationFrame(installIpcBridge);
    return;
  }

  // Page world → bun-main
  document.addEventListener("ava-ipc-out", (rawEvent) => {
    const event = rawEvent as CustomEvent<OutboundDetail>;
    const detail = event.detail;
    if (detail === undefined || detail === null) {
      return;
    }
    const sender = rpc.send[detail.channel];
    if (typeof sender === "function") {
      sender(detail.message);
      return;
    }
    // Lazy-resolved on Electrobun's `send` proxy; access through a
    // typed cast that doesn't narrow to `undefined`.
    (rpc.send as Record<string, (payload: unknown) => void>)[detail.channel]!(
      detail.message,
    );
  });

  // Bun-main → page world
  rpc.addMessageListener("*", (channel, message) => {
    document.dispatchEvent(
      new CustomEvent("ava-ipc-in", {
        detail: { channel, message },
      }),
    );
  });
}

installIpcBridge();
