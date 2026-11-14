import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type RefObject,
} from "react";
import {
  isFilmThemeAcknowledgement,
  isFilmTokensUsedMessage,
} from "../../../showcase/filmTheme/filmTheme";
import {
  resolveVideoThemeFromSnapshot,
  type VideoThemeSnapshot,
} from "../../../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import type { VideoThemeIssue } from "../../../videoTheme/videoTheme.types";

/** About 100 ms, so dragging a slider does not flood the player. */
const THEME_SEND_DELAY_MS = 100;

type Acknowledgement = Readonly<{
  id: string;
  hash?: string;
  issues: readonly VideoThemeIssue[];
}>;

function _expectedTheme(snapshotKey: string, id: string) {
  if (!snapshotKey) {
    return undefined;
  }
  try {
    return resolveVideoThemeFromSnapshot(
      JSON.parse(snapshotKey) as VideoThemeSnapshot,
      [id],
    );
  } catch {
    return undefined;
  }
}

function _isOptionsFrom(data: unknown, id: string): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === "film-options" &&
    "id" in data &&
    data.id === id
  );
}

/**
 * Keeps the live player on the draft's theme: sends the item's snapshot
 * (debounced while editing, and again whenever the player reports its
 * options after loading), tracks the hash it acknowledges, and collects the
 * tokens it reports reading. Downloads wait until the player acknowledges
 * the theme the gallery expects.
 */
export function useCompositionTheme(
  options: Readonly<{
    id: string;
    player: RefObject<HTMLIFrameElement | null>;
    snapshot: VideoThemeSnapshot | undefined;
  }>,
) {
  const { id, player, snapshot } = options;
  const snapshotKey = snapshot ? JSON.stringify(snapshot) : "";
  const expected = useMemo(
    () => _expectedTheme(snapshotKey, id),
    [snapshotKey, id],
  );
  const [acknowledgement, setAcknowledgement] = useState<Acknowledgement>();
  const [usage, setUsage] = useState<
    Readonly<{ id: string; paths: readonly string[] }>
  >({ id, paths: [] });
  const send = useCallback(() => {
    if (snapshotKey) {
      player.current?.contentWindow?.postMessage(
        {
          type: "film-control",
          id,
          action: "theme",
          value: JSON.parse(snapshotKey),
        },
        location.origin,
      );
    }
  }, [id, player, snapshotKey]);
  useEffect(() => {
    const timer = setTimeout(send, THEME_SEND_DELAY_MS);
    return () => clearTimeout(timer);
  }, [send]);
  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== location.origin ||
        event.source !== player.current?.contentWindow
      ) {
        return;
      }
      const { data } = event;
      if (_isOptionsFrom(data, id)) {
        send();
      }
      if (isFilmThemeAcknowledgement(data, id)) {
        setAcknowledgement(
          data.type === "film-theme"
            ? { id, hash: data.hash, issues: [] }
            : { id, issues: data.issues },
        );
      }
      if (isFilmTokensUsedMessage(data, id)) {
        setUsage({ id, paths: data.paths });
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [id, player, send]);
  return {
    isAcknowledged:
      expected !== undefined &&
      acknowledgement?.id === id &&
      acknowledgement.hash === expected.hash,
    playerIssues: acknowledgement?.id === id ? acknowledgement.issues : [],
    usedTokens: usage.id === id ? usage.paths : [],
    cameraPreset: expected?.semantic.camera.preset ?? "authored",
  };
}
