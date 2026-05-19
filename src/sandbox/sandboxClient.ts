import { uuid } from "$/lib/uuid";
import {
  SANDBOX_KEY,
  type SandboxBootRequest,
  type SandboxResponse,
  type SandboxRunRequest,
  type SandboxRunResponse,
  type SandboxRuntime,
} from "@/sandbox/sandboxProtocol";

/**
 * Parent-side client for the Phase 6 Python/R sandbox iframe.
 *
 * Lifecycle:
 *   1. First call to `runInSandbox` mounts a hidden `<iframe>` with
 *      `sandbox="allow-scripts"` (no allow-same-origin) so the
 *      browser uses a null opaque origin.
 *   2. We send a `boot` message and wait for `boot_response`.
 *   3. Then we send the `run` request and resolve / reject when the
 *      `run_response` arrives.
 *
 * Each `runInSandbox` call gets a unique `requestId`; concurrent
 * runs are serialized through the single iframe (Pyodide is
 * single-threaded). If you need parallelism, that's a worker-pool
 * upgrade tracked in the spec.
 */

const SANDBOX_URL = "/sandbox-executor.html";

type PendingRun = {
  resolve: (response: SandboxRunResponse) => void;
  reject: (e: Error) => void;
};

const pending = new Map<string, PendingRun>();

type IframeHandle = {
  iframe: HTMLIFrameElement;
  ready: Promise<void>;
  booted: Promise<void>;
};

let handle: IframeHandle | null = null;

function ensureIframe(): IframeHandle {
  if (handle) {
    return handle;
  }
  const iframe = document.createElement("iframe");
  iframe.src = SANDBOX_URL;
  iframe.style.display = "none";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.position = "absolute";
  // Critical: allow-scripts but NOT allow-same-origin. This forces a
  // null opaque origin so the iframe has no access to app cookies /
  // IndexedDB / DOM.
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("tabindex", "-1");

  let resolveReady: () => void = () => {};
  let resolveBoot: () => void = () => {};
  let rejectReady: (e: Error) => void = () => {};
  const ready = new Promise<void>((res, rej) => {
    resolveReady = res;
    rejectReady = rej;
  });
  const booted = new Promise<void>((res) => {
    resolveBoot = res;
  });

  const onMessage = (event: MessageEvent) => {
    // The iframe runs in a null origin; `event.origin` will be the
    // string "null". Don't tighten this check or messages get dropped.
    if (event.source !== iframe.contentWindow) {
      return;
    }
    const data = event.data as SandboxResponse | undefined;
    if (!data || typeof data !== "object") {
      return;
    }
    if (data.kind === "ready") {
      resolveReady();
      return;
    }
    if (data.kind === "boot_response") {
      resolveBoot();
      return;
    }
    if (data.kind === "log") {
      // Stream sandbox stdout / stderr to the parent console so users
      // can debug their Python / R code from devtools without us
      // having to render a stream UI yet.
      const tag = `[sandbox:${data.channel}]`;
      if (data.channel.endsWith("stderr")) {
        console.warn(tag, data.line);
      } else {
        console.log(tag, data.line);
      }
      return;
    }
    if (data.kind === "run_response") {
      const entry = pending.get(data.requestId);
      if (entry) {
        pending.delete(data.requestId);
        entry.resolve(data);
      }
    }
  };

  window.addEventListener("message", onMessage);

  iframe.addEventListener("error", () => {
    rejectReady(new Error("[sandbox] iframe failed to load"));
  });

  document.body.appendChild(iframe);

  handle = { iframe, ready, booted };
  return handle;
}

async function bootIfNeeded(
  preload: SandboxRuntime[],
): Promise<void> {
  const h = ensureIframe();
  await h.ready;
  // Send boot, await boot_response.
  const bootRequest: SandboxBootRequest = {
    sandboxKey: SANDBOX_KEY,
    kind: "boot",
    requestId: uuid(),
    preload,
  };
  h.iframe.contentWindow?.postMessage(bootRequest, "*");
  await h.booted;
}

/**
 * Run a single Python (or, when WebR lands, R) snippet inside the
 * sandbox. The result is the Arrow IPC bytes of the final
 * `result` DataFrame the user code assigned.
 *
 * On timeout / error, rejects with the original error.
 */
export async function runInSandbox(args: {
  runtime: SandboxRuntime;
  code: string;
  /**
   * Input views as Arrow IPC bytes, by name. The names must match
   * what the user's code references (e.g. `step_filter` for the
   * output of plan step `filter`).
   */
  inputs: Array<{ name: string; arrow: Uint8Array }>;
  timeoutMs?: number;
}): Promise<{ arrow: Uint8Array }> {
  await bootIfNeeded([args.runtime]);
  const h = ensureIframe();

  const requestId = uuid();
  const request: SandboxRunRequest = {
    sandboxKey: SANDBOX_KEY,
    kind: "run",
    requestId,
    runtime: args.runtime,
    code: args.code,
    inputs: args.inputs,
    ...(args.timeoutMs !== undefined ? { timeoutMs: args.timeoutMs } : {}),
  };

  return await new Promise((resolve, reject) => {
    pending.set(requestId, {
      resolve: (response) => {
        if (response.ok) {
          resolve({ arrow: response.arrow });
        } else {
          reject(new Error(response.error));
        }
      },
      reject,
    });
    // Transfer the input ArrayBuffers for zero-copy where possible.
    const transfer = args.inputs
      .map((i) => {
        return i.arrow.buffer;
      })
      .filter((buf): buf is ArrayBuffer => {
        return buf instanceof ArrayBuffer;
      });
    h.iframe.contentWindow?.postMessage(request, "*", transfer);
  });
}

/**
 * Tear down the sandbox iframe. Used when the chat panel unmounts or
 * the user signs out, so Pyodide doesn't keep ~70 MB resident.
 */
export function teardownSandbox(): void {
  if (!handle) {
    return;
  }
  handle.iframe.remove();
  handle = null;
  pending.clear();
}
