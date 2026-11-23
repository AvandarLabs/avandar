import { ContinuityThemePlans } from "../../../src/continuity/ContinuityThemePlans/ContinuityThemePlans";
import { makeCaptionFilesFromPlan } from "../../lib/planHelpers/makeCaptionFilesFromPlan";
import type { Film } from "../../../src/showcase/showcase.types";

type CaptionFilm = Pick<Film, "id" | "plan" | "theme">;
/**
 * A caption download's film and files, or the status to answer with instead.
 */
export type CaptionFilesResult<FilmValue extends CaptionFilm> =
  | Readonly<{
      status: 200;
      film: FilmValue;
      files: ReturnType<typeof makeCaptionFilesFromPlan>;
    }>
  | Readonly<{
      status: 400;
    }>
  | Readonly<{
      status: 404;
    }>;
async function _statusOfFailedLoad({
  id,
  error,
  load,
}: Readonly<{
  id: string;
  error: unknown;
  load: (
    options: Readonly<{
      id: string;
      rawOptions?: Readonly<Record<string, unknown>>;
    }>,
  ) => Promise<unknown>;
}>): Promise<400 | 404> {
  const isKnownFilm = await load({ id: id }).then(
    () => {
      return true;
    },
    () => {
      return false;
    },
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
export async function makeCaptionFilesFromRequest<
  FilmValue extends CaptionFilm,
>(
  request: Readonly<{
    id: string;
    options: Readonly<Record<string, unknown>> | undefined;
    load: (
      options: Readonly<{
        id: string;
        rawOptions?: Readonly<Record<string, unknown>>;
      }>,
    ) => Promise<FilmValue>;
  }>,
): Promise<CaptionFilesResult<FilmValue>> {
  const { id, options, load } = request;
  const result = await (async (): Promise<
    { film: FilmValue } | { status: 400 | 404 }
  > => {
    try {
      return { film: await load({ id, rawOptions: options ?? {} }) };
    } catch (error) {
      return { status: await _statusOfFailedLoad({ id, error, load }) };
    }
  })();
  if ("status" in result) {
    return result;
  }
  const { film } = result;
  if (!film.plan) {
    return { status: 404 };
  }
  const plan = ContinuityThemePlans.fromVideoThemeSnapshot({
    plan: film.plan,
    snapshot: film.theme,
    overrideIds: [film.id],
  });
  return { status: 200, film, files: makeCaptionFilesFromPlan(plan) };
}
