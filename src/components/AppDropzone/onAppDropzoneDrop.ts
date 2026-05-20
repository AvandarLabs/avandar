import { openFileImportFlow } from "./openFileImportFlow";
import type { useLingui } from "@lingui/react/macro";
import type { FileWithPath } from "@mantine/dropzone";

/**
 * Drop handler for the app-wide dropzone: picks the first dropped file
 * and forwards it to the import flow. Extracted so it can be tested
 * directly without simulating drag/drop events in jsdom.
 */
export function onAppDropzoneDrop(
  files: FileWithPath[],
  t: ReturnType<typeof useLingui>["t"],
): void {
  const file = files[0];
  if (file) {
    openFileImportFlow(file, t);
  }
}
