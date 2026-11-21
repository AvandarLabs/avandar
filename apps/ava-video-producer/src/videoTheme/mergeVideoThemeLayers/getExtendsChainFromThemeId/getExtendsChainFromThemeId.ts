import { VideoThemeError } from "../../VideoThemeError";
import type {
  VideoThemeDocument,
  VideoThemeLibrary,
} from "../../videoTheme.types";
/**
 * A theme and every theme it extends, root first. Throws a
 * `VideoThemeError` for an unknown theme or an `extends` cycle. Use it to
 * know which documents a theme depends on, for example to snapshot them.
 */
export function getExtendsChainFromThemeId({
  library,
  themeId,
}: Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
}>): VideoThemeDocument[] {
  const chain: VideoThemeDocument[] = [];
  const seen = new Set<string>();
  let currentId: string | undefined = themeId;
  while (currentId !== undefined) {
    if (seen.has(currentId)) {
      throw new VideoThemeError([
        {
          path: "extends",
          message: `Theme "${themeId}" extends itself through "${currentId}"`,
        },
      ]);
    }
    seen.add(currentId);
    const document = library.get(currentId);
    if (!document) {
      throw new VideoThemeError([
        { path: "extends", message: `Unknown theme "${currentId}"` },
      ]);
    }
    chain.unshift(document);
    currentId = document.extends;
  }
  return chain;
}
