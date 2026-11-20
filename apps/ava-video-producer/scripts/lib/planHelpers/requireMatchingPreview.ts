import fs from "node:fs/promises";
import type { PlanFingerprint } from "./planHelpers.types";

/**
 * Verifies that the preview manifest at `filename` completed and matches
 * `fingerprint`, throwing before `render` can proceed with stale or missing
 * preview evidence.
 */
export async function requireMatchingPreview(
  filename: string,
  fingerprint: Readonly<PlanFingerprint>,
): Promise<void> {
  const saved: { complete?: boolean; fingerprint?: PlanFingerprint } =
    await (async () => {
      try {
        return JSON.parse(await fs.readFile(filename, "utf8"));
      } catch {
        throw new Error(
          "Run preview before render; its complete manifest is missing",
        );
      }
    })();
  if (!saved.complete) {
    throw new Error("The preview did not complete; run preview again");
  }
  if (JSON.stringify(saved.fingerprint) !== JSON.stringify(fingerprint)) {
    throw new Error(
      "Plan, renderer or media changed after preview; regenerate and inspect the preview",
    );
  }
}
