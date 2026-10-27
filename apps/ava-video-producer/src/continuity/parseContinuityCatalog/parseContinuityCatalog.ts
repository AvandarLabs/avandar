import { z } from "zod";
import type { ContinuityCatalogEntry } from "../continuityCatalog";

const BASE_SCHEMA = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  frames: z.number().int().positive(),
  path: z.string().min(1),
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
    z
      .object({
        path: z.string().min(1),
        label: z.string().min(1),
        description: z.string().min(1),
      })
      .strict(),
  ),
}).strict();

/** Parses authored continuity metadata for gallery and render consumers. */
export function parseContinuityCatalog(
  films: unknown,
  studies: unknown,
): readonly ContinuityCatalogEntry[] {
  const parsedFilms = z.array(FILM_SCHEMA).parse(films);
  const parsedStudies = z.array(STUDY_SCHEMA).parse(studies);
  const entries = [...parsedFilms, ...parsedStudies];
  const ids = new Set<string>();
  entries.forEach((entry) => {
    if (ids.has(entry.id)) {
      throw new Error(`Duplicate continuity catalog id: ${entry.id}`);
    }
    ids.add(entry.id);
  });
  const filmIds = new Set(parsedFilms.map((entry) => entry.id));
  parsedStudies.forEach((entry) => {
    if (!filmIds.has(entry.sourceFilm)) {
      throw new Error(
        `Unknown source film "${entry.sourceFilm}" for "${entry.id}"`,
      );
    }
  });
  return entries;
}
