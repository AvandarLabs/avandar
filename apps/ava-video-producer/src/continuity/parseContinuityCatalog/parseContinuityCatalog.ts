import { prop } from "@avandar/utils";
import { z } from "zod";
import type { ContinuityCatalogEntry } from "../isSceneEntry";
/** Directory, under `storyboards/`, that holds every scene study's plan. */
const SCENE_STUDY_DIRECTORY = "vocabulary/";
const BASE_SCHEMA = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  frames: z.number().int().positive(),
  path: z.string().min(1),
  // Omitted for continuity entries. `scene` marks a plan of plain
  // storyboard scenes, which plays without continuity appearance options.
  kind: z.literal("scene").optional(),
});
const FILM_SCHEMA = BASE_SCHEMA.extend({ family: z.literal("films") }).strict();
const STUDY_SCHEMA = BASE_SCHEMA.extend({
  family: z.literal("vocabulary"),
  sourceFilm: z.string().min(1),
  goodFor: z.string().min(1),
  tags: z.array(z.string().min(1)).min(1),
  creativeDirection: z.string().min(1),
  avoid: z.string().min(1),
  controls: z.array(
    z.strictObject({
      path: z.string().min(1),
      label: z.string().min(1),
      description: z.string().min(1),
    }),
  ),
}).strict();
function _assertUniqueIds(entries: readonly ContinuityCatalogEntry[]) {
  const ids = new Set<string>();
  entries.forEach((entry) => {
    if (ids.has(entry.id)) {
      throw new Error(`Duplicate continuity catalog id: ${entry.id}`);
    }
    ids.add(entry.id);
  });
}
/** Parses authored continuity metadata for gallery and render consumers. */
export function parseContinuityCatalog({
  films,
  studies,
}: Readonly<{
  films: unknown;
  studies: unknown;
}>): readonly ContinuityCatalogEntry[] {
  const parsedFilms = z.array(FILM_SCHEMA).parse(films);
  const parsedStudies = z.array(STUDY_SCHEMA).parse(studies);
  const entries = [...parsedFilms, ...parsedStudies];
  _assertUniqueIds(entries);
  const filmIds = new Set(parsedFilms.map(prop("id")));
  parsedStudies.forEach((entry) => {
    if (!filmIds.has(entry.sourceFilm)) {
      throw new Error(
        `Unknown source film "${entry.sourceFilm}" for "${entry.id}"`,
      );
    }
    if (
      entry.kind === "scene" &&
      !entry.path.startsWith(SCENE_STUDY_DIRECTORY)
    ) {
      throw new Error(
        `Scene study "${entry.id}" must live in storyboards/${SCENE_STUDY_DIRECTORY}`,
      );
    }
  });
  return entries;
}
