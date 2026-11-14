import type { ContinuityAppearance } from "../continuity/continuityAppearance";
import type {
  StockInputByPreset,
  StockPresetId,
} from "../stock/contracts/StockContract.types";
import type { ResolvedStockRequest } from "../stock/contracts/stockRequestSchema/stockRequestSchema";
import type { Storyboard } from "../storyboard/schema/schema";
import type { VideoThemePatch } from "../videoTheme/videoTheme.types";
import type { VideoThemeSnapshot } from "../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
/** Data for Film. */
type FilmResult = {
  kind: "storyboard" | "title-study" | "motion-lab";
  preset?: never;
  input?: never;
  schemaVersion?: never;
  accent?: never;
  background?: never;
};

/**
 * A Motion Atlas helper preview: one shared helper played in isolation by
 * the live player. Previews are live only and never exported.
 */
type HelperFilmResult = {
  kind: "helper";
  /** The helper catalog id the preview plays. */
  helper: string;
  /** Public-relative media the preview loads. */
  assets: readonly string[];
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
  /**
   * The authored plan with the viewer's render switches applied. Draw it and
   * count its frames through `createContinuityPlanFromVideoThemeSnapshot(plan,
   * theme, [id])`, because the theme's camera preset can lengthen beats.
   */
  plan?: Storyboard;
  /** The theme every frame resolves. Undefined renders `classic`. */
  theme?: VideoThemeSnapshot;
} & (
  | ({ kind: "stock" } & ResolvedStockRequest)
  | FilmResult
  | HelperFilmResult
);

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
  /** A theme from `themes/` and the unsaved draft to apply on top of it. */
  theme?: Readonly<{ id: string; patch?: VideoThemePatch }>;
};
