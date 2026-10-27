import type { ContinuityAppearance } from "../continuity/continuityAppearance";
import type {
  StockInputByPreset,
  StockPresetId,
} from "../stock/contracts/StockContract.types";
import type { ResolvedStockRequest } from "../stock/contracts/stockRequestSchema/stockRequestSchema";
import type { Storyboard } from "../storyboard/schema/schema";
/** Data for Film. */
type FilmResult = {
  kind: "storyboard" | "title-study" | "motion-lab";
  preset?: never;
  input?: never;
  schemaVersion?: never;
  accent?: never;
  background?: never;
};

/** Validated inputs shared by the live player and downloadable render. */
export type Film = {
  id: string;
  source: string;
  frames: number;
  fps: number;
  width: number;
  height: number;
  delivery: { width: number; height: number };
  loop: boolean;
  showCaptions: boolean;
  plan?: Storyboard;
} & (({ kind: "stock" } & ResolvedStockRequest) | FilmResult);

/** Viewer choices retained for an export of the displayed composition. */
export type FilmOptions = {
  schemaVersion?: 1;
  input?: StockInputByPreset[StockPresetId];
  captions?: boolean;
  cameraMotion?: boolean;
  cameraPreset?: ContinuityAppearance["cameraPreset"];
  motionBlur?: boolean;
  annotations?: boolean;
  annotationRoughness?: number;
  boxRoughness?: number;
  accent?: string;
  background?: string;
};
