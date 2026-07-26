/**
 * Sandboxed Python / R executor.
 *
 * Runs in the null-opaque-origin iframe loaded from
 * `/sandbox-executor.html`. Receives `RunRequest` postMessages from
 * the parent app, lazy-loads Pyodide (for `python` steps) or WebR
 * (for `r` steps) on first use, executes the user-supplied code
 * against an Arrow IPC byte buffer the parent passes in, and posts
 * back the result.
 *
 * **Threat model**: assume Pyodide / WebR code could try to exfiltrate
 * data. The iframe's null opaque origin + strict CSP ensures the code
 * cannot reach the network, the parent's DOM, or any storage. The
 * only data that crosses the boundary is the result Arrow buffer
 * (round-tripping through the parent's `crossBoundary` if it leaves
 * the browser, but in our pipeline this stays inside the browser).
 *
 * **Status**: spec-aligned implementation. NOT yet externally
 * security-reviewed; gate user-facing exposure on that review.
 */

import type {
  SandboxBootRequest,
  SandboxBootResponse,
  SandboxResponse,
  SandboxRunRequest,
} from "@/sandbox/sandboxProtocol";

declare global {
  interface Window {
    __sandboxParentOrigin: string | null;
    loadPyodide?: (opts: {
      indexURL?: string;
      stdout?: (s: string) => void;
      stderr?: (s: string) => void;
    }) => Promise<PyodideInstance>;
  }
}

// Minimal slice of the Pyodide API we actually use. The wider type
// surface lives behind `loadPyodide`'s ambient declarations; we keep
// this narrow to make the boundary obvious.
type PyodideInstance = {
  runPython: (code: string) => unknown;
  runPythonAsync: (code: string) => Promise<unknown>;
  loadPackagesFromImports: (code: string) => Promise<void>;
  globals: {
    set: (name: string, value: unknown) => void;
    get: (name: string) => unknown;
  };
  // `FS` is Pyodide's emscripten file system; we use it to write the
  // Arrow buffer into a tmp file that pyarrow can read.
  FS: {
    writeFile: (
      path: string,
      data: Uint8Array,
      opts?: { encoding?: string },
    ) => void;
    readFile: (path: string) => Uint8Array;
    unlink: (path: string) => void;
  };
};

const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/";

let pyodideLoading: Promise<PyodideInstance> | null = null;
let pyodide: PyodideInstance | null = null;

async function loadPyodide(): Promise<PyodideInstance> {
  if (pyodide) {
    return pyodide;
  }
  if (pyodideLoading) {
    return await pyodideLoading;
  }
  pyodideLoading = (async () => {
    // Pull Pyodide's bootstrap script. The CSP allowlists jsdelivr.
    const loaderUrl = `${PYODIDE_CDN}pyodide.js`;
    await loadScriptViaDOM(loaderUrl);
    if (!window.loadPyodide) {
      throw new Error("[sandbox] Pyodide loader did not register");
    }
    const inst = await window.loadPyodide({
      indexURL: PYODIDE_CDN,
      stdout: (s) => {
        postLogToParent("python_stdout", s);
      },
      stderr: (s) => {
        postLogToParent("python_stderr", s);
      },
    });
    // pyarrow is needed for Arrow IPC roundtripping with DuckDB.
    await inst.loadPackagesFromImports(
      "import pyarrow as pa; import pandas as pd",
    );
    pyodide = inst;
    return inst;
  })();
  return await pyodideLoading;
}

function loadScriptViaDOM(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => {
      return resolve();
    };
    s.onerror = () => {
      return reject(new Error(`[sandbox] script load failed: ${src}`));
    };
    document.head.appendChild(s);
  });
}

function postToParent(message: SandboxResponse): void {
  // The parent origin was captured at iframe boot.
  const target = window.__sandboxParentOrigin ?? "*";
  window.parent.postMessage(message, target);
}

function postLogToParent(
  channel: "python_stdout" | "python_stderr" | "r_stdout" | "r_stderr",
  line: string,
): void {
  postToParent({ kind: "log", channel, line });
}

async function handleBoot(req: SandboxBootRequest): Promise<void> {
  const response: SandboxBootResponse = {
    kind: "boot_response",
    requestId: req.requestId,
    ok: true,
    availableRuntimes: ["python"], // R wired separately when WebR lands.
  };
  postToParent(response);
}

async function handleRun(req: SandboxRunRequest): Promise<void> {
  if (req.runtime !== "python") {
    postToParent({
      kind: "run_response",
      requestId: req.requestId,
      ok: false,
      error: `[sandbox] runtime '${req.runtime}' not enabled in this build`,
    });
    return;
  }

  let timeoutHandle: number | null = null;
  try {
    const inst = await loadPyodide();

    // Write each input view's parquet bytes into Pyodide's FS so
    // Python code can read them as DataFrames via the helper below.
    // Parquet (not Arrow IPC) lets the parent reuse DuckDB-WASM's
    // existing parquet roundtrip without adding new client methods.
    for (const input of req.inputs) {
      inst.FS.writeFile(`/inputs/${input.name}.parquet`, input.arrow);
    }
    inst.globals.set(
      "__avandar_input_names",
      req.inputs.map((i) => {
        return i.name;
      }),
    );

    const wrapper = `
import os, sys
import pyarrow as pa
import pyarrow.parquet as pq
import pandas as pd

os.makedirs("/inputs", exist_ok=True)

def read_input(name):
    """Read a parquet input into a pandas DataFrame."""
    return pq.read_table(f"/inputs/{name}.parquet").to_pandas()

def write_output(df):
    """Serialise a pandas DataFrame back to parquet bytes."""
    table = pa.Table.from_pandas(df, preserve_index=False)
    sink = pa.BufferOutputStream()
    pq.write_table(table, sink, compression="zstd")
    return bytes(sink.getvalue())

# Make the inputs available as locals so user code can reference them
# by view name directly.
_local_inputs = {name: read_input(name) for name in __avandar_input_names}
globals().update(_local_inputs)
`;
    await inst.runPythonAsync(wrapper);

    // Run user code. The convention: assign the final DataFrame to
    // `result` (we pull it out below).
    const timeoutMs = req.timeoutMs ?? 30000;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutHandle = window.setTimeout(() => {
        return reject(new Error(`[sandbox] timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    await Promise.race([inst.runPythonAsync(req.code), timeoutPromise]);

    // Pull `result` out and serialise.
    const arrowBytes = (await inst.runPythonAsync(
      "write_output(result)",
    )) as Uint8Array;

    postToParent({
      kind: "run_response",
      requestId: req.requestId,
      ok: true,
      arrow: arrowBytes,
    });
  } catch (e) {
    postToParent({
      kind: "run_response",
      requestId: req.requestId,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  } finally {
    if (timeoutHandle !== null) {
      window.clearTimeout(timeoutHandle);
    }
    // Cleanup the inputs we wrote in.
    if (pyodide) {
      try {
        for (const input of req.inputs) {
          pyodide.FS.unlink(`/inputs/${input.name}.arrow`);
        }
      } catch {
        // Best-effort.
      }
    }
  }
}

// Strict origin check on every inbound message. The parent stamps
// `expectedSandboxKey` into every request so spurious messages from
// extensions / other iframes get dropped.
const EXPECTED_KEYS = new Set(["avandar-sandbox-v1"]);

window.addEventListener("message", (event) => {
  if (
    window.__sandboxParentOrigin &&
    event.origin !== window.__sandboxParentOrigin &&
    event.origin !== "null"
  ) {
    return;
  }
  const data = event.data;
  if (!data || typeof data !== "object") {
    return;
  }
  if (!EXPECTED_KEYS.has(data.sandboxKey)) {
    return;
  }
  if (data.kind === "boot") {
    void handleBoot(data as SandboxBootRequest);
  } else if (data.kind === "run") {
    void handleRun(data as SandboxRunRequest);
  }
});

// Signal to the parent that the iframe is ready to receive boot/run
// requests. The parent waits for this before queueing work so it
// doesn't fire before the script has installed its message listener.
postToParent({ kind: "ready" });
