const activeDownloads = new Map();

async function requestJob(url, init) {
  const response = await fetch(url, init);
  const job = await response.json();
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

function saveDownload(download) {
  if (!download)
    throw new Error("The export finished without a download. Try again.");
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

function buildExportRequest(id, options) {
  return JSON.stringify({ id, options }, (_key, value) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return value;
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, value[key]]),
    );
  });
}

async function runExport({ request, onStatus }) {
  onStatus({ state: "running", message: "Preparing MP4…" });
  let job = await requestJob("/api/exports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: request,
  });
  while (job.state === "running") {
    onStatus(job);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    job = await requestJob(`/api/exports/${encodeURIComponent(job.id)}`);
  }
  if (job.state === "failed") {
    throw new Error(job.message || "The export failed. Try again.");
  }
  saveDownload(job.download);
  onStatus(job);
  return job;
}

/**
 * Render and download a film using the selected preview options.
 * Calls onStatus with job progress and rejects failures so the caller can retry.
 * Concurrent identical requests share the active export and download.
 */
export async function downloadFilm({ id, options = {}, onStatus = () => {} }) {
  const request = buildExportRequest(id, options);
  if (activeDownloads.has(request)) return activeDownloads.get(request);
  const pending = runExport({ request, onStatus })
    .catch((error) => {
      onStatus({ state: "failed", message: error.message });
      throw error;
    })
    .finally(() => activeDownloads.delete(request));
  activeDownloads.set(request, pending);
  return pending;
}

/** Defer source refresh until every pending browser download has been started. */
export function afterDownloads(callback) {
  let cancelled = false;
  const waitForDownloads = async () => {
    do {
      await Promise.allSettled([...activeDownloads.values()]);
    } while (!cancelled && activeDownloads.size);
    if (!cancelled) callback();
  };
  void waitForDownloads();
  return () => {
    cancelled = true;
  };
}
