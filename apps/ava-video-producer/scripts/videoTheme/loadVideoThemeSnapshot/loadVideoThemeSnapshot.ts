import { fileURLToPath } from "node:url";
import { createVideoThemeLibrary } from "../../../src/videoTheme/builtInVideoThemes/builtInVideoThemes";
import { videoThemePatchSchema } from "../../../src/videoTheme/videoThemeSchema/videoThemeSchema";
import {
  createVideoThemeSnapshot,
  resolveVideoThemeFromSnapshot,
  type VideoThemeSnapshot,
} from "../../../src/videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import { createThemeStore } from "../../showcase/themeStore/themeStore";
import type { VideoThemePatch } from "../../../src/videoTheme/videoTheme.types";

const THEMES_DIRECTORY = fileURLToPath(
  new URL("../../../themes", import.meta.url),
);

/**
 * A snapshot of a theme in `themes/`, with an optional draft patch, checked
 * by resolving it once so an invalid theme or patch fails here rather than
 * mid-render. Used wherever a render starts on the server: showcase films,
 * exports, posters, the parity gate, and the `video` and `motion` CLIs.
 */
export async function loadVideoThemeSnapshot(
  request: Readonly<{ id: string; patch?: VideoThemePatch }>,
  options: Readonly<{ directory?: string }> = {},
): Promise<VideoThemeSnapshot> {
  const store = createThemeStore({
    directory: options.directory ?? THEMES_DIRECTORY,
  });
  const summaries = await store.list();
  const documents = await Promise.all(
    summaries.map(async ({ id }) => (await store.read(id)).document),
  );
  const library = createVideoThemeLibrary(documents);
  if (!library.has(request.id)) {
    throw new Error(
      `Unknown video theme "${request.id}". Themes live in themes/<id>.theme.json.`,
    );
  }
  const patches = request.patch
    ? [videoThemePatchSchema.parse(request.patch) as VideoThemePatch]
    : [];
  const snapshot = createVideoThemeSnapshot(library, request.id, patches);
  resolveVideoThemeFromSnapshot(snapshot, []);
  return snapshot;
}
