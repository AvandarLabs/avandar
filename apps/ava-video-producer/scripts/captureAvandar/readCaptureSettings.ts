import { resolve } from "node:path";
import { CaptureUrlSafety } from "../captureLib/CaptureUrlSafety/CaptureUrlSafety";
import { loadFlows } from "./loadFlows";
import type { CaptureOptions, CaptureViewport } from "./captureAvandar.types";
import type { CaptureSettings } from "./captureRun.types";

const DEFAULT_FLOWS = [
  "import",
  "explorer",
  "dashboards",
  "cases",
  "map",
] as const;
function _readFlowIds(flowIds: unknown): string[] {
  if (
    !Array.isArray(flowIds) ||
    !flowIds.length ||
    new Set(flowIds).size !== flowIds.length
  ) {
    throw new Error("flowIds must be a nonempty unique list");
  }
  return flowIds.map((id) => {
    return CaptureUrlSafety.validateId({
      value: id,
      name: "flow id",
    });
  });
}
function _readViewport(viewport: Readonly<CaptureViewport>): CaptureViewport {
  if (
    !Number.isInteger(viewport.width) ||
    !Number.isInteger(viewport.height) ||
    viewport.width < 800 ||
    viewport.height < 600 ||
    viewport.width > 3840 ||
    viewport.height > 2160
  ) {
    throw new Error(
      "Capture viewport must be integer pixels within 800×600 and 3840×2160",
    );
  }
  return { ...viewport };
}
/** The login credentials, from options, the environment, or seed defaults. */
function _readCredentials(
  options: Readonly<CaptureOptions>,
): Pick<CaptureSettings, "email" | "password"> {
  const email =
    options.email ?? process.env.AVANDAR_DEMO_EMAIL ?? "user@avandarlabs.com";
  const password =
    options.password ?? process.env.AVANDAR_DEMO_PASSWORD ?? "avandar";
  if (
    typeof email !== "string" ||
    !email ||
    typeof password !== "string" ||
    !password
  ) {
    throw new Error("Capture login needs nonempty credentials");
  }
  return { email, password };
}
function _readTimings(
  options: Readonly<CaptureOptions>,
): Pick<CaptureSettings, "timeout" | "checkpointSettleMs"> {
  const timeout = options.actionTimeoutMs ?? 20000;
  if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 120000) {
    throw new Error("actionTimeoutMs must be 1000 to 120000 milliseconds");
  }
  const checkpointSettleMs = options.checkpointSettleMs ?? 600;
  if (
    !Number.isInteger(checkpointSettleMs) ||
    checkpointSettleMs < 0 ||
    checkpointSettleMs > 5000
  ) {
    throw new Error("checkpointSettleMs must be 0 to 5000 milliseconds");
  }
  return { timeout, checkpointSettleMs };
}
/**
 * Validates every capture option and fills its default, so `runCapture`
 * works from one checked `CaptureSettings` value.
 */
export async function readCaptureSettings(
  options: Readonly<CaptureOptions>,
): Promise<CaptureSettings> {
  const root = resolve(options.root ?? process.cwd());
  const baseUrl = CaptureUrlSafety.validateBaseUrl(
    options.baseUrl ?? "http://localhost:5173",
  );
  const workspace = CaptureUrlSafety.validateId({
    value: options.workspace ?? "avandar-labs",
    name: "workspace",
  });
  const runLabel = CaptureUrlSafety.validateId({
    value: options.runLabel ?? "harborfield",
    name: "runLabel",
  });
  const flowIds = _readFlowIds(options.flowIds ?? DEFAULT_FLOWS);
  const flows = options.flowMap ?? (await loadFlows(root));
  flowIds.forEach((id) => {
    if (typeof flows[id] !== "function") {
      throw new Error(`Unknown capture flow: ${id}`);
    }
  });
  return {
    root,
    baseUrl,
    workspace,
    runLabel,
    flowIds,
    flows,
    viewport: _readViewport(options.viewport ?? { width: 1440, height: 900 }),
    ..._readCredentials(options),
    ..._readTimings(options),
  };
}
