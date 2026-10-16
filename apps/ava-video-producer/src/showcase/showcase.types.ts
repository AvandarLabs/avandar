import type { StockPresetId } from "../stock/catalog";
import type { Storyboard } from "../storyboard/schema/schema";

/** Validated inputs shared by the live player and downloadable render. */
export type Film = {
  id: string;
  kind: "storyboard" | "stock" | "title-study" | "motion-lab";
  source: string;
  frames: number;
  fps: number;
  width: number;
  height: number;
  delivery: { width: number; height: number };
  loop: boolean;
  showCaptions: boolean;
  plan?: Storyboard;
  preset?: StockPresetId;
  accent?: string;
  background?: string;
};

/** Viewer choices retained for an export of the displayed composition. */
export type FilmOptions = {
  captions?: boolean;
  accent?: string;
  background?: string;
};
