import { isPlainObject, pick } from "@avandar/utils";
import type {
  StockInputByPreset,
  StockPresetId,
} from "../../src/stock/contracts/StockContract.types";

/** Public status from the local, on-demand export service. */
export type DownloadStatus = {
  id?: string;
  state: string;
  message: string;
  download?: string;
};

/** Options the preview player selected for an export. */
type DownloadFilmOptions = {
  captions?: boolean;
  cameraMotion?: boolean;
  motionBlur?: boolean;
  annotations?: boolean;
  accent?: string;
  background?: string;
  schemaVersion?: 1;
  input?: StockInputByPreset[StockPresetId];
  /** The saved theme to render with and the unsaved edits on top of it. */
  theme?: { id: string; patch?: Readonly<Record<string, unknown>> };
};

const activeDownloads = new Map<string, Promise<DownloadStatus>>();

async function _requestJob(
  url: string,
  init?: RequestInit,
): Promise<DownloadStatus> {
  const response = await fetch(url, init);
  const job: DownloadStatus = await response.json();
  if (!response.ok) {
    const fallback =
      response.status === 409
        ? "Another export is running. Try again when it finishes."
        : "The export could not start. Try again.";
    throw new Error(job.message || fallback);
  }
  if (!["running", "complete", "failed"].includes(job.state)) {
    throw new Error("The export returned an unexpected response. Try again.");
  }
  return job;
}

function _saveDownload(download: string | undefined): void {
  if (!download) {
    throw new Error("The export finished without a download. Try again.");
  }
  const url = new URL(download, window.location.href);
  if (url.origin !== window.location.origin) {
    throw new Error("The export returned an invalid download address.");
  }
  const link = document.createElement("a");
  link.href = url.href;
  link.download = "";
  document.body.append(link);
  link.click();
  link.remove();
}

/** The export body with object keys sorted, so equal requests share a key. */
function _buildExportRequest(
  id: string,
  options: Readonly<Record<string, unknown>>,
): string {
  return JSON.stringify({ id, options }, (_key, value: unknown) => {
    if (!isPlainObject(value)) {
      return value;
    }
    return pick(value, Object.keys(value).sort());
  });
}

async function _runExport({
  request,
  onStatus,
}: Readonly<{
  request: string;
  onStatus: (status: DownloadStatus) => void;
}>): Promise<DownloadStatus> {
  onStatus({ state: "running", message: "Preparing MP4…" });
  let job = await _requestJob("/api/exports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: request,
  });
  while (job.state === "running") {
    onStatus(job);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    job = await _requestJob(`/api/exports/${encodeURIComponent(job.id ?? "")}`);
  }
  if (job.state === "failed") {
    throw new Error(job.message || "The export failed. Try again.");
  }
  _saveDownload(job.download);
  onStatus(job);
  return job;
}

/**
 * Render and download a film using the selected preview options.
 * Calls onStatus with job progress and rejects failures so the caller can
 * retry.
 * Concurrent identical requests share the active export and download.
 */
async function _downloadFilm({
  id,
  options = {},
  onStatus = () => {},
}: Readonly<{
  id: string;
  options?: DownloadFilmOptions | Readonly<Record<string, unknown>>;
  onStatus?: (status: DownloadStatus) => void;
}>): Promise<DownloadStatus> {
  const request = _buildExportRequest(id, options);
  const activeDownload = activeDownloads.get(request);
  if (activeDownload) {
    return activeDownload;
  }
  const pending = _runExport({ request, onStatus })
    .catch((error: Error) => {
      onStatus({ state: "failed", message: error.message });
      throw error;
    })
    .finally(() => activeDownloads.delete(request));
  activeDownloads.set(request, pending);
  return pending;
}

/**
 * Defer source refresh until every pending browser download has been started.
 * Returns a function that cancels the deferred callback.
 */
function _afterDownloads(callback: () => void): () => void {
  let isCancelled = false;
  const waitForDownloads = async () => {
    do {
      await Promise.allSettled(activeDownloads.values());
    } while (!isCancelled && activeDownloads.size);
    if (!isCancelled) {
      callback();
    }
  };
  void waitForDownloads();
  return () => {
    isCancelled = true;
  };
}

/**
 * The film export downloads of the showcase pages and the Motion Atlas. Both
 * members read one private registry of in-flight exports, so a source refresh
 * can wait for the downloads that are still being started.
 *
 * Called by the showcase page scripts and by the Atlas hooks that start a film
 * download or refresh a preview when the source changes, such as
 * `useCompositionDownload`, `usePreviewDownload`, `useCompositionPlayer`,
 * `HelperPreview` and `useMotionGalleryState`.
 */
export const FilmDownloads = {
  downloadFilm: _downloadFilm,
  afterDownloads: _afterDownloads,
};
