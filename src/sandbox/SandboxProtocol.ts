/**
 * Wire protocol between the app (parent) and the sandboxed Python/R
 * executor iframe.
 *
 * One source of truth, imported by both sides. The iframe runs in a
 * null opaque origin, so the parent passes a stable `sandboxKey`
 * (`avandar-sandbox-v1`) on every request and the iframe rejects
 * messages without it. This protects against rogue messages from
 * browser extensions / other iframes.
 */

/** Shared runtime constants for the sandbox message protocol. */
export const SandboxProtocol = {
  sandboxKey: "avandar-sandbox-v1",
} as const;

export type SandboxRuntime = "python" | "r";

/** Parent → sandbox: load runtimes and wait for ready. */
export type SandboxBootRequest = {
  sandboxKey: typeof SandboxProtocol.sandboxKey;
  kind: "boot";
  requestId: string;
  /** Which runtimes the iframe should preload. */
  preload: SandboxRuntime[];
};

/** Sandbox → parent: boot complete. */
export type SandboxBootResponse = {
  kind: "boot_response";
  requestId: string;
  ok: boolean;
  /** Runtimes that this iframe build actually supports. */
  availableRuntimes: SandboxRuntime[];
  error?: string;
};

/** Parent → sandbox: execute one plan step. */
export type SandboxRunRequest = {
  sandboxKey: typeof SandboxProtocol.sandboxKey;
  kind: "run";
  requestId: string;
  runtime: SandboxRuntime;
  /** User-supplied code. Assign the final DataFrame to `result`. */
  code: string;
  /**
   * Input views as Arrow IPC bytes. Each entry maps a name (the
   * upstream `step_<id>` or dataset alias) to a transferable
   * Uint8Array.
   */
  inputs: Array<{ name: string; arrow: Uint8Array }>;
  /** Hard timeout in ms. Defaults to 30000 if omitted. */
  timeoutMs?: number;
};

/** Sandbox → parent: run complete (success or failure). */
export type SandboxRunResponse =
  | {
      kind: "run_response";
      requestId: string;
      ok: true;
      /** Arrow IPC bytes of the result table. */
      arrow: Uint8Array;
    }
  | {
      kind: "run_response";
      requestId: string;
      ok: false;
      error: string;
    };

/** Sandbox → parent: stdout/stderr lines streamed during a run. */
export type SandboxLogMessage = {
  kind: "log";
  channel: "python_stdout" | "python_stderr" | "r_stdout" | "r_stderr";
  line: string;
};

/** Sandbox → parent: emitted once the iframe is ready to receive boot. */
export type SandboxReadyMessage = {
  kind: "ready";
};

export type SandboxResponse =
  | SandboxBootResponse
  | SandboxRunResponse
  | SandboxLogMessage
  | SandboxReadyMessage;
