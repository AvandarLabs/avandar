import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type RefObject,
} from "react";
import { isFilmTokensUsedMessage } from "../../../showcase/filmTheme/filmTheme";
import {
  resolveVideoThemeFromSnapshot,
  type VideoThemeSnapshot,
} from "../../../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import {
  getCurrentAcknowledgement,
  getThemeExportState,
  receiveThemeAcknowledgement,
  type ReceivedThemeAcknowledgement,
} from "./themeExportState/themeExportState";

/** About 100 ms, so dragging a slider does not flood the player. */
const THEME_SEND_DELAY_MS = 100;

/** How long the player has to acknowledge a theme before the gallery offers a retry. */
const ACKNOWLEDGEMENT_TIMEOUT_MS = 8000;

type PlayerReplies = Readonly<{
  id: string;
  acknowledgement?: ReceivedThemeAcknowledgement;
  paths: readonly string[];
}>;

type Player = RefObject<HTMLIFrameElement | null>;

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
 * The live player's theme acknowledgement, tagged with the request the
 * player echoed (never the request that is current on arrival), and its
 * token usage for film `id`. Both reset whenever the id changes, so a reply
 * from an earlier visit to the same film never stands in for its new
 * player's answer.
 */
function usePlayerReplies(
  id: string,
  player: Player,
  onOptions: () => void,
): PlayerReplies {
  const [replies, setReplies] = useState<PlayerReplies>({ id, paths: [] });
  if (replies.id !== id) {
    setReplies({ id, paths: [] });
  }
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
        onOptions();
      }
      const acknowledgement = receiveThemeAcknowledgement(data, id);
      if (acknowledgement) {
        setReplies((current) =>
          current.id === id ? { ...current, acknowledgement } : current,
        );
      }
      if (isFilmTokensUsedMessage(data, id)) {
        setReplies((current) =>
          current.id === id ? { ...current, paths: data.paths } : current,
        );
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [id, player, onOptions]);
  return replies.id === id ? replies : { id, paths: [] };
}

/**
 * Whether the request named by `requestKey` has gone unanswered for too
 * long. The timeout clears whenever the key changes, so returning to a key
 * that timed out earlier starts a fresh wait.
 */
function useRequestTimeout(requestKey: string | undefined): boolean {
  const [timedOutKey, setTimedOutKey] = useState<string>();
  useEffect(() => {
    if (requestKey === undefined) {
      return;
    }
    const timer = setTimeout(
      () => setTimedOutKey(requestKey),
      ACKNOWLEDGEMENT_TIMEOUT_MS,
    );
    return () => {
      clearTimeout(timer);
      setTimedOutKey(undefined);
    };
  }, [requestKey]);
  return requestKey !== undefined && timedOutKey === requestKey;
}

/**
 * Posts the snapshot to the player, debounced while it keeps changing. Each
 * post names its request, which the player echoes in its answer.
 */
function useThemeSender(
  request: Readonly<{ id: string; key: string | undefined }>,
  player: Player,
  snapshotKey: string,
) {
  const { id, key: requestKey } = request;
  const send = useCallback(() => {
    if (snapshotKey) {
      player.current?.contentWindow?.postMessage(
        {
          type: "film-control",
          id,
          action: "theme",
          value: JSON.parse(snapshotKey),
          requestKey,
        },
        location.origin,
      );
    }
  }, [id, player, snapshotKey, requestKey]);
  useEffect(() => {
    const timer = setTimeout(send, THEME_SEND_DELAY_MS);
    return () => clearTimeout(timer);
  }, [send]);
  return send;
}

/**
 * Keeps the live player on the draft's theme: sends the item's snapshot
 * (debounced while editing, and again whenever the player reports its
 * options after loading), tracks what it acknowledges, and collects the
 * tokens it reports reading. Downloads use `exportState`, which never stays
 * pending: a refusal names its reason and a silent player times out with a
 * retry.
 */
export function useCompositionTheme(
  options: Readonly<{
    id: string;
    player: Player;
    snapshot: VideoThemeSnapshot | undefined;
    isScene: boolean;
    hasDraftIssues: boolean;
  }>,
) {
  const { id, player, snapshot, isScene, hasDraftIssues } = options;
  const snapshotKey = snapshot ? JSON.stringify(snapshot) : "";
  const expected = useMemo(
    () => _expectedTheme(snapshotKey, id),
    [snapshotKey, id],
  );
  const [attempt, setAttempt] = useState(0);
  const requestKey = snapshotKey
    ? `${id}:${expected?.hash}:${attempt}`
    : undefined;
  const send = useThemeSender({ id, key: requestKey }, player, snapshotKey);
  const replies = usePlayerReplies(id, player, send);
  const isTimedOut = useRequestTimeout(requestKey);
  return {
    exportState: getThemeExportState({
      isScene,
      hasDraftIssues,
      expectedHash: expected?.hash,
      acknowledgement: getCurrentAcknowledgement(
        replies.acknowledgement,
        requestKey,
      ),
      isTimedOut,
    }),
    usedTokens: replies.paths,
    // A new attempt is a new request, so the debounced sender posts it
    // under its own key rather than the one that was refused or timed out.
    retry: () => setAttempt((current) => current + 1),
  };
}
