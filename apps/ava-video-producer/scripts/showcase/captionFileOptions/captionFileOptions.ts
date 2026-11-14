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
