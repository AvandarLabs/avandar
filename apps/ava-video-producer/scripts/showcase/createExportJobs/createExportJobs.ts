import { randomUUID } from "node:crypto";

function _getJobStatus(job: ExportJob | undefined): ExportStatus | undefined {
  return job
    ? {
        id: job.id,
        state: job.state,
        message: job.message,
        download: job.download,
      }
    : undefined;
}
function _renderJob<T>({
  render,
  job,
  input,
  onSettled,
}: Readonly<{
  render: Parameters<typeof createExportJobs<T>>[0];
  job: ExportJob;
  input: T;
  onSettled: () => void;
}>): void {
  void render({
    input: input,
    directoryId: job.id,
    progress: (message) => {
      job.message = message;
    },
  })
    .then((filename) => {
      job.filename = filename;
      job.state = "complete";
      job.message = "Download ready";
      job.download = `/api/exports/${job.id}/download`;
    })
    .catch((error) => {
      console.error("Showcase export failed:", error);
      job.state = "failed";
      job.message =
        "Render failed. Check the showcase terminal, then retry the download.";
    })
    .finally(() => {
      onSettled();
    });
}
/** Public job state never exposes local filesystem paths. */
export type ExportStatus = {
  id: string;
  state: "running" | "complete" | "failed";
  message: string;
  download?: string;
};
type RenderJob<T> = (
  options: Readonly<{
    input: T;
    directoryId: string;
    progress: (message: string) => void;
  }>,
) => Promise<string>;
type ExportJob = ExportStatus & { key: string; filename?: string };
type ExportJobs<T> = {
  start: (key: string, input: T) => ExportStatus;
  get: (id: string) => ExportStatus | undefined;
  file: (id: string) => string | undefined;
};

/** Serialize expensive renders and make failures retryable. */
export function createExportJobs<T>(render: RenderJob<T>): ExportJobs<T> {
  const jobs = new Map<string, ExportJob>();
  let active: ExportJob | undefined;
  const get = (id: string): ExportStatus | undefined => {
    return _getJobStatus(jobs.get(id));
  };
  const start = (key: string, input: T): ExportStatus => {
    if (active) {
      if (active.key === key) {
        return get(active.id)!;
      }
      throw new Error(
        "Another film is already rendering. Try again when it finishes.",
      );
    }
    const job: ExportJob = {
      id: randomUUID(),
      key,
      state: "running",
      message: "Preparing current composition…",
    };
    jobs.set(job.id, job);
    active = job;
    _renderJob({
      render,
      job,
      input,
      onSettled: () => {
        active = undefined;
      },
    });
    return get(job.id)!;
  };
  return {
    start,
    get,
    file: (id: string) => {
      return jobs.get(id)?.state === "complete"
        ? jobs.get(id)?.filename
        : undefined;
    },
  };
}
