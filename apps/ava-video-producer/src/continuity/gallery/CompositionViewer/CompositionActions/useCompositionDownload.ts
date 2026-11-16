import { useState } from "react";
import { FilmDownloads } from "../../../../../showcase/FilmDownloads/FilmDownloads";
import type { ExportTheme } from "../../../../videoThemeEditor/themeDraft/themeDraft";
import type { CompositionExportOptions } from "../compositionExportOptions";

/** On-demand rendering with the acknowledged options and theme, with progress scoped to the selected film. */
export function useCompositionDownload(options: {
  id: string;
  options: CompositionExportOptions | undefined;
  captions: boolean | undefined;
  theme: ExportTheme | undefined;
}) {
  const { id, options: appearance, theme } = options;
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ id: "", message: "" });
  async function start() {
    if (busy || appearance === undefined) {
      return;
    }
    setBusy(true);
    try {
      await FilmDownloads.downloadFilm({
        id,
        options: theme ? { ...appearance, theme } : appearance,
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
