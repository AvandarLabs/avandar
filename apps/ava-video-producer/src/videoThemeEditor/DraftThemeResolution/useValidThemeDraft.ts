import { useMemo, useState } from "react";
import { EMPTY_THEME_DRAFT, type ThemeDraft } from "../ThemeDrafts/ThemeDrafts";
import {
  type LastValidDraft,
  DraftThemeResolution,
} from "./DraftThemeResolution";
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
  const isValid = useMemo(() => {
    return DraftThemeResolution.isThemeDraftValid({ library, themeId, draft });
  }, [library, themeId, draft]);
  const [lastValid, setLastValid] = useState<LastValidDraft>();
  const nextLastValid = DraftThemeResolution.nextLastValidDraft({
    current: lastValid,
    themeId,
    draft,
    isValid,
  });
  if (nextLastValid !== lastValid) {
    setLastValid(nextLastValid);
  }
  return isValid
    ? { draft, isValid }
    : {
        draft:
          lastValid?.themeId === themeId ? lastValid.draft : EMPTY_THEME_DRAFT,
        isValid,
      };
}
