import type { ContinuityAppearance } from "../../../continuityAppearance";
import { useState } from "react";
import { downloadFilm } from "../../../../../showcase/download.js";

/** On-demand rendering, with progress scoped to the selected film. */
export function useCompositionDownload(options: {
  id: string;
  options: ContinuityAppearance | undefined;
  captions: boolean | undefined;
}) {
  const { id, options: appearance } = options;
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ id: "", message: "" });
  async function start() {
    if (busy || appearance === undefined) {
      return;
    }
    setBusy(true);
    try {
      await downloadFilm({
        id,
        options: appearance,
        onStatus: (job) => setProgress({ id, message: job.message }),
      });
    } catch {
      setProgress({
        id,
        message: "Export failed. Check the showcase terminal and retry.",
      });
    } finally {
      setBusy(false);
    }
  }
  return { busy, status: progress.id === id ? progress.message : "", start };
}
