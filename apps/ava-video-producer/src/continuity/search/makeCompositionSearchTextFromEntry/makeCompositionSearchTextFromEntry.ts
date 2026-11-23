import type { ContinuityVocabularyEntry } from "../../isSceneEntry";

/** Semantic retrieval text excludes playback settings and source paths. */
export function makeCompositionSearchTextFromEntry(
  entry: Readonly<
    Pick<
      ContinuityVocabularyEntry,
      | "title"
      | "description"
      | "goodFor"
      | "tags"
      | "creativeDirection"
      | "avoid"
    >
  >,
): string {
  return [
    entry.title,
    entry.description,
    entry.goodFor,
    ...entry.tags,
    entry.creativeDirection,
    entry.avoid,
  ]
    .map((text) => {
      return text.trim().replace(/\s+/g, " ");
    })
    .filter(Boolean)
    .join("\n");
}
