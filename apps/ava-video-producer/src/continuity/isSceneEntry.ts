import films from "./films/filmCatalog.yaml";
import { parseContinuityCatalog } from "./parseContinuityCatalog/parseContinuityCatalog";
import studies from "./vocabulary/studyCatalog.yaml";
/** Collection family used by the gallery filters and selection state. */
export type ContinuityFamily = "films" | "vocabulary";
type ContinuityCatalogBase = {
  id: string;
  title: string;
  category: string;
  description: string;
  frames: number;
  path: string;
  /**
   * Omitted for continuity entries. `scene` marks a plan of plain storyboard
   * scenes and shot transitions at 1920 by 1080, whose controls name shot
   * fields (`props`, `transition`, `theme`) instead of continuity beats.
   */
  kind?: "scene";
};
/** An authored input that can be adjusted when reusing a study. */
export type ContinuityControl = {
  path: string;
  label: string;
  description: string;
};
/** A complete explanatory film. */
export type ContinuityFilmEntry = ContinuityCatalogBase & {
  family: "films";
};
/** Reusable study guidance and a link to its complete source argument. */
export type ContinuityVocabularyEntry = ContinuityCatalogBase & {
  family: "vocabulary";
  sourceFilm: string;
  goodFor: string;
  tags: string[];
  creativeDirection: string;
  avoid: string;
  controls: readonly ContinuityControl[];
};
/**
 * Searchable film or reusable-study metadata, preserving family-specific
 * fields.
 */
export type ContinuityCatalogEntry =
  | ContinuityFilmEntry
  | ContinuityVocabularyEntry;
/** Whether an entry plays plain storyboard scenes rather than continuity. */
export function isSceneEntry(
  entry: Readonly<Pick<ContinuityCatalogBase, "kind">>,
): boolean {
  return entry.kind === "scene";
}
/**
 * A single allowlist for the gallery, live players and downloadable pictures.
 */
export const CONTINUITY_CATALOG = parseContinuityCatalog({
  films,
  studies,
});
