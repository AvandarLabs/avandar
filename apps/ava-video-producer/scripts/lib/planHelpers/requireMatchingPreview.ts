import fs from "node:fs/promises";
import type { PlanFingerprint } from "./planHelpers.types";

/** Refuse a render without a complete preview of the same evidence. */
export async function requireMatchingPreview(
  filename: string,
  fingerprint: PlanFingerprint,
): Promise<void> {
  let saved: { complete?: boolean; fingerprint?: PlanFingerprint };
  try {
    saved = JSON.parse(await fs.readFile(filename, "utf8"));
  } catch {
    throw new Error(
      "Run preview before render; its complete manifest is missing",
    );
  }
  if (!saved.complete) {
    throw new Error("The preview did not complete; run preview again");
  }
  if (JSON.stringify(saved.fingerprint) !== JSON.stringify(fingerprint)) {
    throw new Error(
      "Plan, renderer or media changed after preview; regenerate and inspect the preview",
    );
  }
}
