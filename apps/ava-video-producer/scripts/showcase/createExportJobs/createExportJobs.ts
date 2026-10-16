import { randomUUID } from "node:crypto";

/** Public job state never exposes local filesystem paths. */
export type ExportStatus = {
  id: string;
  state: "running" | "complete" | "failed";
  message: string;
  download?: string;
};
type ExportJob = ExportStatus & { key: string; filename?: string };

/** Serialize expensive renders and make failures retryable. */
export function createExportJobs<T>(
  render: (
    input: T,
    directoryId: string,
    progress: (message: string) => void,
  ) => Promise<string>,
) {
  const jobs = new Map<string, ExportJob>();
  let active: ExportJob | undefined;
  const get = (id: string): ExportStatus | undefined => {
    const job = jobs.get(id);
    return job
      ? {
          id: job.id,
          state: job.state,
          message: job.message,
          download: job.download,
        }
      : undefined;
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
    void render(input, job.id, (message) => {
      job.message = message;
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
        active = undefined;
      });
    return get(job.id)!;
  };
  return {
    start,
    get,
    file: (id: string) =>
      jobs.get(id)?.state === "complete" ? jobs.get(id)?.filename : undefined,
  };
}
