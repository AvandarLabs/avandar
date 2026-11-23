import { useCallback, useEffect, useMemo, useState } from "react";
import { FilmThemeMessages } from "../../../../showcase/FilmThemeMessages/FilmThemeMessages";
import {
  type VideoThemeSnapshot,
  VideoThemeSnapshots,
} from "../../../../videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";
import {
  type ThemeExportState,
  ThemeExportState as ThemeExportStateModule,
} from "../ThemeExportState/ThemeExportState";
import { usePlayerReplies } from "./usePlayerReplies";
import type { Player } from "./useCompositionTheme.types";

type Options = {
  id: string;
  player: Player;
  snapshot: VideoThemeSnapshot | undefined;
  isScene: boolean;
  hasDraftIssues: boolean;
};
function useThemeRequest({
  snapshot,
  id,
}: Readonly<Pick<Options, "snapshot" | "id">>): Readonly<{
  snapshotKey: string;
  expected: ReturnType<typeof _expectedTheme>;
  requestKey: string | undefined;
  setAttempt: import("react").Dispatch<import("react").SetStateAction<number>>;
}> {
  const snapshotKey = snapshot ? JSON.stringify(snapshot) : "";
  const expected = useMemo(() => {
    return _expectedTheme({
      snapshotKey,
      id,
    });
  }, [snapshotKey, id]);
  const [attempt, setAttempt] = useState(0);
  const requestKey = snapshotKey
    ? `${id}:${expected?.hash}:${attempt}`
    : undefined;
  return { snapshotKey, expected, requestKey, setAttempt };
}
/** About 100 ms, so dragging a slider does not flood the player. */
const THEME_SEND_DELAY_MS = 100;
/**
 * How long the player has to acknowledge a theme before the gallery offers a
 * retry.
 */
const ACKNOWLEDGEMENT_TIMEOUT_MS = 8000;
/** The live player's theme export state, read tokens, and retry action. */
type CompositionThemeState = {
  exportState: ThemeExportState;
  usedTokens: readonly string[];
  retry: () => void;
};
function _expectedTheme({
  snapshotKey,
  id,
}: Readonly<{
  snapshotKey: string;
  id: string;
}>) {
  if (!snapshotKey) {
    return undefined;
  }
  try {
    return VideoThemeSnapshots.toResolvedTheme({
      snapshot: FilmThemeMessages.parseVideoThemeSnapshot(
        JSON.parse(snapshotKey),
      ),
      overrideIds: [id],
    });
  } catch {
    return undefined;
  }
}
/**
 * Whether the request named by `requestKey` has gone unanswered for too
 * long. The timeout clears whenever the key changes, so returning to a key
 * that timed out earlier starts a fresh wait.
 */
function useRequestTimeout(requestKey: string | undefined): boolean {
  const [timedOutKey, setTimedOutKey] = useState<string>();
  useEffect(
    function timeOutUnansweredRequest() {
      if (requestKey === undefined) {
        return;
      }
      const timer = setTimeout(() => {
        return setTimedOutKey(requestKey);
      }, ACKNOWLEDGEMENT_TIMEOUT_MS);
      return () => {
        clearTimeout(timer);
        setTimedOutKey(undefined);
      };
    },
    [requestKey],
  );
  return requestKey !== undefined && timedOutKey === requestKey;
}
/**
 * Posts the snapshot to the player, debounced while it keeps changing. Each
 * post names its request, which the player echoes in its answer.
 */
function useThemeSender({
  request,
  player,
  snapshotKey,
}: Readonly<{
  request: Readonly<{
    id: string;
    key: string | undefined;
  }>;
  player: Player;
  snapshotKey: string;
}>) {
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
  useEffect(
    function sendThemeAfterDelay() {
      const timer = setTimeout(send, THEME_SEND_DELAY_MS);
      return () => {
        return clearTimeout(timer);
      };
    },
    [send],
  );
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
  options: Readonly<Options>,
): CompositionThemeState {
  const { id, player, snapshot, isScene, hasDraftIssues } = options;
  const { snapshotKey, expected, requestKey, setAttempt } = useThemeRequest({
    snapshot,
    id,
  });
  const send = useThemeSender({
    request: { id, key: requestKey },
    player,
    snapshotKey,
  });
  const replies = usePlayerReplies({
    id,
    player,
    onOptions: send,
  });
  const isTimedOut = useRequestTimeout(requestKey);
  return {
    exportState: ThemeExportStateModule.getThemeExportState({
      isScene,
      hasDraftIssues,
      expectedHash: expected?.hash,
      acknowledgement: ThemeExportStateModule.getCurrentAcknowledgement({
        acknowledgement: replies.acknowledgement,
        requestKey,
      }),
      isTimedOut,
    }),
    usedTokens: replies.paths,
    // A new attempt is a new request, so the debounced sender posts it
    // under its own key rather than the one that was refused or timed out.
    retry: () => {
      return setAttempt((current) => {
        return current + 1;
      });
    },
  };
}
