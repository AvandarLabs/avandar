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
};

/** An authored input that can be adjusted when reusing a study. */
export type ContinuityControl = {
  path: string;
  label: string;
  description: string;
};

/** A complete explanatory film. */
export type ContinuityFilmEntry = ContinuityCatalogBase & { family: "films" };

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

/** Searchable film or reusable-study metadata, preserving family-specific fields. */
export type ContinuityCatalogEntry =
  | ContinuityFilmEntry
  | ContinuityVocabularyEntry;
/** A single allowlist for the gallery, live players and downloadable pictures. */
export const CONTINUITY_CATALOG = parseContinuityCatalog(films, studies);
