import { fileURLToPath } from "node:url";
import { makeSnapshotFromThemeRequest } from "../../../src/videoTheme/makeSnapshotFromThemeRequest";
import { makeVideoThemeLibraryFromDocuments } from "../../../src/videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { videoThemePatchSchema } from "../../../src/videoTheme/VideoThemeSchemas/VideoThemeSchemas";
import {
  type VideoThemeSnapshot,
  VideoThemeSnapshots,
} from "../../../src/videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";
import { createThemeStore } from "../../showcase/createThemeStore/createThemeStore";
import type { VideoThemePatch } from "../../../src/videoTheme/videoTheme.types";

const THEMES_DIRECTORY = fileURLToPath(
  new URL("../../../themes", import.meta.url),
);
/**
 * A snapshot of a theme in `themes/`, with an optional draft patch under the
 * gallery's draft rule (see `makeSnapshotFromThemeRequest`), checked
 * by resolving it once so an invalid theme or patch fails here rather than
 * mid-render. Used wherever a render starts on the server: showcase films,
 * exports, posters, the parity gate, and the `video` and `motion` CLIs.
 */
export async function loadVideoThemeSnapshot({
  request,
  options = {},
}: Readonly<{
  request: Readonly<{
    id: string;
    patch?: VideoThemePatch;
  }>;
  options?: Readonly<{
    directory?: string;
  }>;
}>): Promise<VideoThemeSnapshot> {
  const store = createThemeStore({
    directory: options.directory ?? THEMES_DIRECTORY,
  });
  const summaries = await store.list();
  const documents = await Promise.all(
    summaries.map(async ({ id }) => {
      return (await store.read(id)).document;
    }),
  );
  const library = makeVideoThemeLibraryFromDocuments(documents);
  if (!library.has(request.id)) {
    throw new Error(
      `Unknown video theme "${request.id}". Themes live in themes/<id>.theme.json.`,
    );
  }
  // A present patch, even an empty one, marks a draft (see
  // `makeSnapshotFromThemeRequest`), so it is kept rather than dropped.
  const patch =
    request.patch === undefined
      ? undefined
      : videoThemePatchSchema.parse(request.patch);
  const snapshot = makeSnapshotFromThemeRequest({
    library,
    id: request.id,
    patch,
  });
  VideoThemeSnapshots.toResolvedTheme({
    snapshot,
    overrideIds: [],
  });
  return snapshot;
}
