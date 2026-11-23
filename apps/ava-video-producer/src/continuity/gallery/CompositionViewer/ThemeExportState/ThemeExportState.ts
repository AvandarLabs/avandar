import {
  FILM_REFUSAL_CODES,
  FilmThemeMessages,
} from "../../../../showcase/FilmThemeMessages/FilmThemeMessages";
import type { VideoThemeIssue } from "../../../../videoTheme/videoTheme.types";
/** Why an export cannot use the draft's theme. */
export type ThemeRefusalReason =
  | (typeof FILM_REFUSAL_CODES)[number]
  | "theme-issues"
  | "draft-issues";
/** Whether a download may render the theme the live player shows. */
export type ThemeExportState =
  | Readonly<{
      kind: "ready";
    }>
  | Readonly<{
      kind: "pending";
    }>
  | Readonly<{
      kind: "timed-out";
    }>
  | Readonly<{
      kind: "refused";
      reason: ThemeRefusalReason;
    }>;
/**
 * The live player's latest answer: a resolved hash, or the issues it refused
 * with.
 */
export type ThemeAcknowledgement = Readonly<{
  hash?: string;
  issues: readonly VideoThemeIssue[];
}>;
function _isPlayerErrorCode(
  message: string,
): message is (typeof FILM_REFUSAL_CODES)[number] {
  return (FILM_REFUSAL_CODES as readonly string[]).includes(message);
}
function _reasonFromIssues(
  issues: readonly VideoThemeIssue[],
): ThemeRefusalReason {
  const [first] = issues;
  return issues.length === 1 &&
    first.path === "" &&
    _isPlayerErrorCode(first.message)
    ? first.message
    : "theme-issues";
}
/**
 * Where a composition's export stands against its live player. Scene
 * studies take no theme, so they are always ready. Otherwise draft issues
 * and player refusals block the export with a reason, a matching hash makes
 * it ready, and a player that has not answered in time is timed out rather
 * than pending forever.
 */
function _getThemeExportState(
  input: Readonly<{
    isScene: boolean;
    hasDraftIssues: boolean;
    /**
     * The hash the gallery resolves for its snapshot, or undefined if it
     * cannot.
     */
    expectedHash: string | undefined;
    acknowledgement: ThemeAcknowledgement | undefined;
    isTimedOut: boolean;
  }>,
): ThemeExportState {
  const { isScene, hasDraftIssues, expectedHash, acknowledgement } = input;
  if (isScene) {
    return { kind: "ready" };
  }
  if (hasDraftIssues) {
    return { kind: "refused", reason: "draft-issues" };
  }
  if (expectedHash === undefined) {
    return { kind: "refused", reason: "theme-unresolvable" };
  }
  if (acknowledgement && acknowledgement.hash === undefined) {
    return {
      kind: "refused",
      reason: _reasonFromIssues(acknowledgement.issues),
    };
  }
  return acknowledgement?.hash === expectedHash
    ? { kind: "ready" }
    : input.isTimedOut
      ? { kind: "timed-out" }
      : { kind: "pending" };
}
/** An acknowledgement with the theme request the player echoed in it. */
export type ReceivedThemeAcknowledgement = ThemeAcknowledgement &
  Readonly<{
    requestKey: string | undefined;
  }>;
/**
 * The acknowledgement that still answers the current theme request. A
 * resolved hash always stays, because `getThemeExportState` compares it with
 * the expected hash. A refusal names no hash, so it only counts for the
 * request it answers: a new snapshot or a retry waits for a new answer.
 */
function _getCurrentAcknowledgement({
  acknowledgement,
  requestKey,
}: Readonly<{
  acknowledgement: ReceivedThemeAcknowledgement | undefined;
  requestKey: string | undefined;
}>): ReceivedThemeAcknowledgement | undefined {
  if (!acknowledgement || acknowledgement.hash !== undefined) {
    return acknowledgement;
  }
  return acknowledgement.requestKey === requestKey
    ? acknowledgement
    : undefined;
}
/**
 * Reads a posted message as the theme answer for film `id`, tagged with the
 * request the player says it answers. The tag comes from the message, never
 * from whichever request is current on arrival: a refusal for an earlier
 * request can land after a newer one is current, and must not be taken as
 * that newer request's answer. A message that names no request answers none.
 */
function _receiveThemeAcknowledgement({
  data,
  id,
}: Readonly<{
  data: unknown;
  id: string;
}>): ReceivedThemeAcknowledgement | undefined {
  const message = { data, id };
  if (!FilmThemeMessages.isFilmThemeAcknowledgement(message)) {
    return undefined;
  }
  const { data: acknowledgement } = message;
  const { requestKey } = acknowledgement;
  return acknowledgement.type === "film-theme"
    ? { hash: acknowledgement.hash, issues: [], requestKey }
    : { issues: acknowledgement.issues, requestKey };
}

/**
 * Tracks acknowledged player themes before CompositionViewer exports a film.
 */
export const ThemeExportState = {
  /** Where a composition's export stands against its live player. */
  getThemeExportState: _getThemeExportState,
  /** The acknowledgement that still answers the current theme request. */
  getCurrentAcknowledgement: _getCurrentAcknowledgement,
  /**
   * Reads a posted message as the theme answer for film `id`, tagged with the
   * request the player says it answers.
   */
  receiveThemeAcknowledgement: _receiveThemeAcknowledgement,
};
