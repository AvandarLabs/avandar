/*
 * JS source that the bun-main process injects into the webview's page
 * main world via `webview.executeJavascript(...)` on `dom-ready`. The
 * existing Electrobun preload runs in an isolated content world and
 * cannot directly install globals into the page; `executeJavascript`
 * is WKWebView's documented way to run code in the page main world.
 *
 * Once injected, `window.electrobun` exposes the `{send, once}` shape
 * `shared/platform/ipc/client.ts` (`callIpc`) reads from `globalThis`.
 * Messages cross the world boundary via DOM `CustomEvent`s on
 * `document`: the page world dispatches `ava-ipc-out` and listens for
 * `ava-ipc-in`; the preload world (Electrobun rpc lives there) handles
 * the inverse end.
 */

/**
 * Inline-injected JS string. Plain template string so we can ship it
 * straight to `webview.executeJavascript` without a build step.
 */
export const DESKTOP_IPC_BRIDGE_SCRIPT = `
(function installAvandarIpcBridge() {
  if (window.electrobun !== undefined) {
    return;
  }

  var OUT_EVENT = "ava-ipc-out";
  var IN_EVENT = "ava-ipc-in";

  window.electrobun = {
    send: function (channel, message) {
      document.dispatchEvent(new CustomEvent(OUT_EVENT, {
        detail: { channel: channel, message: message }
      }));
    },
    once: function (channel, callback) {
      function handle(ev) {
        if (ev.detail && ev.detail.channel === channel) {
          document.removeEventListener(IN_EVENT, handle);
          callback(ev.detail.message);
        }
      }
      document.addEventListener(IN_EVENT, handle);
    }
  };
})();
`;
