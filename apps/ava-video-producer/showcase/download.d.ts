/** Public status from the local, on-demand export service. */
export type DownloadStatus = {
  id?: string;
  state: string;
  message: string;
  download?: string;
};
/** Inputs for downloadFilm. */
type DownloadFilmOptions = {
  captions?: boolean;
  cameraMotion?: boolean;
  motionBlur?: boolean;
  annotations?: boolean;
  annotationRoughness?: number;
  boxRoughness?: number;
  accent?: string;
  background?: string;
  schemaVersion?: 1;
  input?: import("../src/stock/contracts/StockContract.types").StockInputByPreset[import("../src/stock/contracts/StockContract.types").StockPresetId];
};

/** Render the selected film/options and download only its completed output. */
export function downloadFilm(options: {
  id: string;
  options?: DownloadFilmOptions;
  onStatus?: (status: DownloadStatus) => void;
}): Promise<DownloadStatus>;

/** Wait for pending downloads before refreshing the page. Returns cleanup. */
export function afterDownloads(callback: () => void): () => void;
