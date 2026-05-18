import { FileWithPath } from "@mantine/dropzone";
import { openFileImportFlow } from "./openFileImportFlow";

/**
 * Drop handler for the app-wide dropzone: picks the first dropped file
 * and forwards it to the import flow. Extracted so it can be tested
 * directly without simulating drag/drop events in jsdom.
 */
export function onAppDropzoneDrop(files: FileWithPath[]): void {
  const file = files[0];
  if (file) {
    openFileImportFlow(file);
  }
}
