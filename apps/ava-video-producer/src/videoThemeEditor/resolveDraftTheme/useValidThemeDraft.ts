import { useMemo, useState } from "react";
import { EMPTY_THEME_DRAFT, type ThemeDraft } from "../themeDraft/themeDraft";
import {
  isThemeDraftValid,
  nextLastValidDraft,
  type LastValidDraft,
} from "./resolveDraftTheme";
import type { VideoThemeLibrary } from "../../videoTheme/videoTheme.types";

/**
 * The draft previews and exports may use: the current draft when every part
 * resolves, otherwise the last one of this theme that did, and whether the
 * current draft resolves. A preview must never receive a draft that throws.
 */
export function useValidThemeDraft(
  options: Readonly<{
    library: VideoThemeLibrary;
    themeId: string;
    draft: ThemeDraft;
  }>,
): { draft: ThemeDraft; isValid: boolean } {
  const { library, themeId, draft } = options;
  const isValid = useMemo(
    () => isThemeDraftValid({ library, themeId, draft }),
    [library, themeId, draft],
  );
  const [lastValid, setLastValid] = useState<LastValidDraft>();
  const nextLastValid = nextLastValidDraft({
    current: lastValid,
    themeId,
    draft,
    isValid,
  });
  if (nextLastValid !== lastValid) {
    setLastValid(nextLastValid);
  }
  if (isValid) {
    return { draft, isValid };
  }
  return {
    draft: lastValid?.themeId === themeId ? lastValid.draft : EMPTY_THEME_DRAFT,
    isValid,
  };
}
