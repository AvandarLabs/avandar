import { z } from "zod";
import { stockRequestSchema } from "../../stock/contracts/stockRequestSchema/stockRequestSchema";
import { storyboardSchema } from "../../storyboard/schema/schema";
import { FilmKinds } from "../FilmKinds";
import { FilmThemeMessages } from "../FilmThemeMessages/FilmThemeMessages";
import type { Film } from "../showcase.types";

const filmMetadataSchema = z.object({
  id: z.string(),
  source: z.string(),
  frames: z.number(),
  fps: z.number(),
  width: z.number(),
  height: z.number(),
  delivery: z.object({ width: z.number(), height: z.number() }),
  loop: z.boolean(),
  showCaptions: z.boolean(),
  kind: z.enum(FilmKinds.values),
  plan: storyboardSchema.optional(),
});
const helperMetadataSchema = z.object({
  helper: z.string(),
  assets: z.array(z.string()),
});
/**
 * Decodes film metadata and its helper, stock, storyboard and theme payloads.
 */
export function parseFilm(value: unknown): Film {
  const record = z.record(z.string(), z.unknown()).parse(value);
  const metadata = {
    ...filmMetadataSchema.parse(record),
    ...(record.theme === undefined
      ? {}
      : { theme: FilmThemeMessages.parseVideoThemeSnapshot(record.theme) }),
  };
  if (metadata.kind === "stock") {
    const { preset, schemaVersion, input, accent, background } = record;
    const request = stockRequestSchema.parse({
      preset,
      schemaVersion,
      input,
      accent,
      background,
    });
    return { ...metadata, ...request, kind: "stock" };
  }
  if (metadata.kind === "helper") {
    return {
      ...metadata,
      ...helperMetadataSchema.parse(record),
      kind: "helper",
    };
  }
  return { ...metadata, kind: metadata.kind };
}
