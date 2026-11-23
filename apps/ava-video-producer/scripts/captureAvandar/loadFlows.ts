import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { CaptureFlow } from "./captureAvandar.types";

/**
 * Loads the workspace flow map a capture run executes, from
 * `capture-flows/AvandarCaptureFlows.ts`. `runCapture` and `capture --list`
 * read it.
 */
export async function loadFlows(
  root: string,
): Promise<Record<string, CaptureFlow>> {
  const module: { AvandarCaptureFlows?: unknown } = await import(
    pathToFileURL(
      join(resolve(root), "capture-flows", "AvandarCaptureFlows.ts"),
    ).href
  );
  if (
    !module.AvandarCaptureFlows ||
    typeof module.AvandarCaptureFlows !== "object"
  ) {
    throw new Error(
      "capture-flows/AvandarCaptureFlows.ts must export AvandarCaptureFlows",
    );
  }
  return module.AvandarCaptureFlows as Record<string, CaptureFlow>;
}
