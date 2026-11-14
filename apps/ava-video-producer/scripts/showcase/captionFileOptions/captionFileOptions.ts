function _themeOption(themeId: string, cameraPreset: string | null) {
  return {
    id: themeId,
    ...(cameraPreset
      ? {
          patch: {
            other: {
              video: { semantic: { camera: { preset: cameraPreset } } },
            },
          },
        }
      : {}),
  };
}

/**
 * Film options for a transcript or caption download from its query string.
 * Caption timing depends on the camera preset, which is a theme token, so
 * `theme` and `cameraPreset` become a theme option. `ShowcaseFilms.load`
 * validates both.
 */
export function getCaptionFileOptionsFromSearch(
  parameters: URLSearchParams,
): Readonly<Record<string, unknown>> {
  const themeId = parameters.get("theme");
  const cameraMotion = parameters.get("cameraMotion");
  return {
    ...(themeId
      ? { theme: _themeOption(themeId, parameters.get("cameraPreset")) }
      : {}),
    ...(cameraMotion === null
      ? {}
      : { cameraMotion: cameraMotion !== "false" }),
  };
}

/** A caption download's film, or the status to answer with instead. */
export type CaptionFilmResult<FilmValue> =
  | Readonly<{ status: 200; film: FilmValue }>
  | Readonly<{ status: 400 | 404 }>;

/**
 * Loads the film a transcript or caption download asks for. A film that
 * loads without the query's options but not with them is a bad query (400);
 * one that never loads is unknown (404). The load error stays on the server.
 */
export async function loadCaptionFilm<FilmValue>(
  options: Readonly<{
    id: string;
    parameters: URLSearchParams;
    load: (
      id: string,
      options: Readonly<Record<string, unknown>>,
    ) => Promise<FilmValue>;
  }>,
): Promise<CaptionFilmResult<FilmValue>> {
  const { id, parameters, load } = options;
  try {
    return {
      status: 200,
      film: await load(id, getCaptionFileOptionsFromSearch(parameters)),
    };
  } catch (error) {
    const isKnownFilm = await load(id, {}).then(
      () => true,
      () => false,
    );
    if (isKnownFilm) {
      console.error("Invalid caption download options:", error);
    }
    return { status: isKnownFilm ? 400 : 404 };
  }
}
