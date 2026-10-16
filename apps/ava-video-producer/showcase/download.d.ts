/** Public status from the local, on-demand export service. */
export type DownloadStatus = {
  id?: string;
  state: string;
  message: string;
  download?: string;
};
/** Render the selected film/options and download only its completed output. */
export function downloadFilm(options: {
  id: string;
  options?: { captions?: boolean; accent?: string; background?: string };
  onStatus?: (status: DownloadStatus) => void;
}): Promise<DownloadStatus>;

/** Wait for pending downloads before refreshing the page. Returns cleanup. */
export function afterDownloads(callback: () => void): () => void;
