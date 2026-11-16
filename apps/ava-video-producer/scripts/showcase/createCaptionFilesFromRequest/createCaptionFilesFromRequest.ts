import { createContinuityPlanFromVideoThemeSnapshot } from "../../../src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";
import { captionFiles } from "../../lib/planHelpers/captionFiles";
import type { Film } from "../../../src/showcase/showcase.types";

type CaptionFilm = Pick<Film, "id" | "plan" | "theme">;

/** A caption download's film and files, or the status to answer with instead. */
export type CaptionFilesResult<FilmValue extends CaptionFilm> =
  | Readonly<{
      status: 200;
      film: FilmValue;
      files: ReturnType<typeof captionFiles>;
    }>
  | Readonly<{ status: 400 }>
  | Readonly<{ status: 404 }>;

async function _statusOfFailedLoad({
  id,
  error,
  load,
}: Readonly<{
  id: string;
  error: unknown;
  load: (id: string) => Promise<unknown>;
}>): Promise<400 | 404> {
  const isKnownFilm = await load(id).then(
    () => true,
    () => false,
  );
  console.error(
    isKnownFilm
      ? "Invalid caption download options:"
      : "Unknown caption download film:",
    error,
  );
  return isKnownFilm ? 400 : 404;
}

/**
 * The transcript and caption files for a film loaded with the same options
 * an export sends, `theme: { id, patch }` included, so caption timing
 * follows the camera tokens the MP4 renders with. A film that loads without
 * the options but not with them is a bad request (400); one that never
 * loads, or has no plan, is not found (404). Load errors stay on the server.
 */
export async function createCaptionFilesFromRequest<
  FilmValue extends CaptionFilm,
>(
  request: Readonly<{
    id: string;
    options: Readonly<Record<string, unknown>> | undefined;
    load: (
      id: string,
      options?: Readonly<Record<string, unknown>>,
    ) => Promise<FilmValue>;
  }>,
): Promise<CaptionFilesResult<FilmValue>> {
  const { id, options, load } = request;
  let film: FilmValue;
  try {
    film = await load(id, options ?? {});
  } catch (error) {
    return { status: await _statusOfFailedLoad({ id, error, load }) };
  }
  if (!film.plan) {
    return { status: 404 };
  }
  const plan = createContinuityPlanFromVideoThemeSnapshot(
    film.plan,
    film.theme,
    [film.id],
  );
  return { status: 200, film, files: captionFiles(plan) };
}
