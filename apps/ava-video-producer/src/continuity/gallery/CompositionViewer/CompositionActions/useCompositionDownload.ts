import { useState } from "react";
import { FilmDownloads } from "../../../../../showcase/FilmDownloads/FilmDownloads";
import type { ExportTheme } from "../../../../videoThemeEditor/ThemeDrafts/ThemeDrafts";
import type { CompositionExportOptions } from "../compositionExportOptions/compositionExportOptions";

/** The selected film's export progress and the action that starts it. */
type CompositionDownload = {
  busy: boolean;
  status: string;
  start: () => Promise<void>;
};

type UseCompositionDownloadOptions = {
  id: string;
  options: CompositionExportOptions | undefined;
  captions: boolean | undefined;
  theme: ExportTheme | undefined;
};
/**
 * On-demand rendering with the acknowledged options and theme, with progress
 * scoped to the selected film.
 */
export function useCompositionDownload(
  options: UseCompositionDownloadOptions,
): CompositionDownload {
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
        onStatus: (job) => {
          return setProgress({ id, message: job.message });
        },
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
