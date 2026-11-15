import { useCallback, useEffect, useRef, useState } from "react";
import {
  getActiveThemeIdFromLocation,
  rememberActiveThemeId,
} from "../themeDraftStorage/themeDraftStorage";
import type { VideoThemeLibrary } from "../../videoTheme/videoTheme.types";
import type { BrowserStorage } from "./getBrowserStorage";

/**
 * The theme being edited and a way to switch it. Reads `?theme=` and the
 * viewer's last choice; a URL theme that loads after the built-ins is
 * adopted until the viewer picks one. Switching rewrites `?theme=` so a
 * shared link opens the same theme.
 */
export function useActiveThemeId(
  options: Readonly<{ library: VideoThemeLibrary; storage: BrowserStorage }>,
): readonly [string, (themeId: string) => void] {
  const { library, storage } = options;
  const availableKey = [...library.keys()].join(",");
  const hasChosen = useRef(false);
  const [themeId, setThemeId] = useState(() =>
    getActiveThemeIdFromLocation({
      search: location.search,
      storage,
      available: availableKey.split(","),
    }),
  );
  useEffect(() => {
    if (!hasChosen.current) {
      setThemeId(
        getActiveThemeIdFromLocation({
          search: location.search,
          storage,
          available: availableKey.split(","),
        }),
      );
    }
  }, [availableKey, storage]);
  const selectTheme = useCallback(
    (id: string) => {
      hasChosen.current = true;
      setThemeId(id);
      rememberActiveThemeId(storage, id);
      const url = new URL(location.href);
      url.searchParams.set("theme", id);
      try {
        history.replaceState(history.state, "", url);
      } catch {
        // A sandboxed frame can refuse URL changes. The choice still applies.
      }
    },
    [storage],
  );
  return [themeId, selectTheme] as const;
}
