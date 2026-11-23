import { getValueAtPath } from "../../videoTheme/getValueAtPath";
import { getDocumentPathFromTokenPath } from "../getDocumentPathFromTokenPath/getDocumentPathFromTokenPath";
import { setValueAtPath } from "../setValueAtPath";
import { ThemeDrafts } from "./ThemeDrafts";
import type { VideoThemePatch } from "../../videoTheme/videoTheme.types";
/** Applies complete draft token values to a saved theme or an item override. */
export function applyPatchToTheme({
  target,
  patch,
}: Readonly<{
  target: VideoThemePatch;
  patch: VideoThemePatch;
}>): VideoThemePatch {
  return ThemeDrafts.listTokenPathsFromPatch(patch).reduce(
    (result, tokenPath) => {
      const documentPath = getDocumentPathFromTokenPath(tokenPath);
      return setValueAtPath({
        source: result,
        path: documentPath,
        value: getValueAtPath({
          source: patch,
          path: documentPath,
        }),
      });
    },
    target,
  );
}
