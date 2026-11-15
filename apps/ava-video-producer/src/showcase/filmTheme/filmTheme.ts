import { z, ZodError } from "zod";
import { VideoThemeError } from "../../videoTheme/VideoThemeError/VideoThemeError";
import {
  VIDEO_THEME_MAX_BYTES,
  VIDEO_THEME_SLUG_PATTERN,
  videoThemeDocumentSchema,
  videoThemePatchSchema,
} from "../../videoTheme/videoThemeSchema/videoThemeSchema";
import {
  makeResolvedVideoThemeFromSnapshot,
  type VideoThemeSnapshot,
} from "../../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import type { VideoThemeIssue } from "../../videoTheme/videoTheme.types";

const MAX_ISSUES = 100;
const MAX_ISSUE_PATH_LENGTH = 512;
const MAX_ISSUE_MESSAGE_LENGTH = 1000;
const MAX_TOKEN_PATHS = 4096;
const MAX_TOKEN_PATH_LENGTH = 256;
const MAX_FILM_ID_LENGTH = 256;
const MAX_REQUEST_KEY_LENGTH = 512;

/** Controls that change a film's look, so they must name the film they target. */
const FILM_SCOPED_ACTIONS: ReadonlySet<string> = new Set([
  "appearance",
  "theme",
]);

/** Issue messages for failures that carry no theme issue of their own. */
const PAYLOAD_TOO_LARGE = "payload-too-large";
const PAYLOAD_UNREADABLE = "payload-unreadable";
const THEME_UNRESOLVABLE = "theme-unresolvable";
const FILM_UNSUPPORTED = "film-unsupported";

const snapshotSchema = z.strictObject({
  themeId: z.string().regex(VIDEO_THEME_SLUG_PATTERN),
  documents: z.array(videoThemeDocumentSchema).max(8),
  patches: z.array(videoThemePatchSchema).max(4),
});

const issueSchema = z.strictObject({
  path: z.string().max(MAX_ISSUE_PATH_LENGTH),
  message: z.string().max(MAX_ISSUE_MESSAGE_LENGTH),
});

/** Names the theme request a control carries, so the answer can echo it. */
const requestKeySchema = z.string().max(MAX_REQUEST_KEY_LENGTH);

const acknowledgementSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("film-theme"),
    id: z.string(),
    hash: z.string(),
    requestKey: requestKeySchema.optional(),
  }),
  z.strictObject({
    type: z.literal("film-theme-error"),
    id: z.string(),
    issues: z.array(issueSchema).max(MAX_ISSUES),
    requestKey: requestKeySchema.optional(),
  }),
]);

const tokensUsedSchema = z.strictObject({
  type: z.literal("film-tokens-used"),
  id: z.string(),
  paths: z.array(z.string().max(MAX_TOKEN_PATH_LENGTH)).max(MAX_TOKEN_PATHS),
});

const filmControlSchema = z.strictObject({
  type: z.literal("film-control"),
  id: z.string().max(MAX_FILM_ID_LENGTH).optional(),
  action: z.enum([
    "play",
    "pause",
    "replay",
    "seek",
    "speed",
    "loop",
    "appearance",
    "theme",
    "options",
  ]),
  value: z.unknown().optional(),
  requestKey: requestKeySchema.optional(),
});

/** A control the gallery posts to the live player, without its envelope. */
export type FilmControl = Readonly<{
  action: z.infer<typeof filmControlSchema>["action"];
  value: unknown;
  /** The theme request the control was sent for, echoed in the answer. */
  requestKey?: string;
}>;

/** The live player's answer to a theme: the resolved hash, or why it refused. */
export type FilmThemeAcknowledgement = Readonly<
  z.infer<typeof acknowledgementSchema>
>;

/** The tokens a live film has read so far. */
export type FilmTokensUsedMessage = Readonly<z.infer<typeof tokensUsedSchema>>;

/**
 * Validates a snapshot that crossed a window boundary. Throws a `ZodError`
 * on any problem.
 */
export function parseVideoThemeSnapshot(value: unknown): VideoThemeSnapshot {
  return snapshotSchema.parse(value);
}

/** The serialized size of a payload in bytes, or undefined if it cannot be serialized. */
function _byteLengthOf(value: unknown): number | undefined {
  try {
    return new TextEncoder().encode(JSON.stringify(value) ?? "").byteLength;
  } catch {
    return undefined;
  }
}

function _boundIssues(issues: readonly VideoThemeIssue[]): VideoThemeIssue[] {
  return issues.slice(0, MAX_ISSUES).map((issue) => {
    return {
      path: issue.path.slice(0, MAX_ISSUE_PATH_LENGTH),
      message: issue.message.slice(0, MAX_ISSUE_MESSAGE_LENGTH),
    };
  });
}

function _issuesFromError(error: unknown): VideoThemeIssue[] {
  if (error instanceof VideoThemeError) {
    return _boundIssues(error.issues);
  }
  if (error instanceof ZodError) {
    return _boundIssues(
      error.issues.map((issue) => {
        return {
          path: issue.path.map(String).join("."),
          message: issue.message,
        };
      }),
    );
  }
  return [{ path: "", message: THEME_UNRESOLVABLE }];
}

/** Why a payload is refused before parsing, or undefined if its size is fine. */
function _payloadIssue(value: unknown): VideoThemeIssue | undefined {
  const byteLength = _byteLengthOf(value);
  if (byteLength === undefined) {
    return { path: "", message: PAYLOAD_UNREADABLE };
  }
  return byteLength > VIDEO_THEME_MAX_BYTES
    ? { path: "", message: PAYLOAD_TOO_LARGE }
    : undefined;
}

function _withRequestKey(
  message: FilmThemeAcknowledgement,
  requestKey: string | undefined,
): FilmThemeAcknowledgement {
  return requestKey === undefined ? message : { ...message, requestKey };
}

/**
 * What the live player does with a `theme` message: the snapshot to apply
 * when it resolves, and the acknowledgement to post back either way. The
 * acknowledgement echoes `requestKey`, so the gallery knows which request a
 * refusal answers even when a newer one has been sent since.
 */
export function createFilmThemeAcknowledgement(
  id: string,
  value: unknown,
  requestKey?: string,
): Readonly<{
  snapshot?: VideoThemeSnapshot;
  message: FilmThemeAcknowledgement;
}> {
  const payloadIssue = _payloadIssue(value);
  if (payloadIssue) {
    return {
      message: _withRequestKey(
        { type: "film-theme-error", id, issues: [payloadIssue] },
        requestKey,
      ),
    };
  }
  try {
    const snapshot = parseVideoThemeSnapshot(value);
    // The film root resolves with the film id as its override scope, so the
    // hash matches the picture.
    const { hash } = makeResolvedVideoThemeFromSnapshot(snapshot, [id]);
    return {
      snapshot,
      message: _withRequestKey({ type: "film-theme", id, hash }, requestKey),
    };
  } catch (error) {
    return {
      message: _withRequestKey(
        { type: "film-theme-error", id, issues: _issuesFromError(error) },
        requestKey,
      ),
    };
  }
}

/**
 * The refusal the live player posts when its film has no themed composition
 * to apply a theme to, so the gallery stops waiting for a hash.
 */
export function createUnsupportedFilmThemeError(
  id: string,
  requestKey?: string,
): FilmThemeAcknowledgement {
  return _withRequestKey(
    {
      type: "film-theme-error",
      id,
      issues: [{ path: "", message: FILM_UNSUPPORTED }],
    },
    requestKey,
  );
}

/**
 * The usage message the live player posts as its film reads tokens. It
 * keeps within the limits the gallery checks: overlong paths are dropped and
 * the list stops at the path cap, so one bad path never voids the report.
 */
export function createFilmTokensUsedMessage(
  id: string,
  paths: readonly string[],
): FilmTokensUsedMessage {
  const boundedPaths = paths
    .filter((path) => path.length <= MAX_TOKEN_PATH_LENGTH)
    .slice(0, MAX_TOKEN_PATHS);
  return { type: "film-tokens-used", id, paths: boundedPaths };
}

/** Whether a posted message is a theme acknowledgement for this film. */
export function isFilmThemeAcknowledgement(
  data: unknown,
  id: string,
): data is FilmThemeAcknowledgement {
  const result = acknowledgementSchema.safeParse(data);
  return result.success && result.data.id === id;
}

/** Whether a posted message is a usage report for this film. */
export function isFilmTokensUsedMessage(
  data: unknown,
  id: string,
): data is FilmTokensUsedMessage {
  const result = tokensUsedSchema.safeParse(data);
  return result.success && result.data.id === id;
}

/**
 * Reads a control message posted to the live player for film `id`. Returns
 * undefined for anything malformed or meant for another film. Transport
 * controls may omit the film id; appearance and theme controls must name it.
 * The value is left unparsed for the handler of its action.
 */
export function parseFilmControlMessage(
  data: unknown,
  id: string,
): FilmControl | undefined {
  const result = filmControlSchema.safeParse(data);
  if (!result.success) {
    return undefined;
  }
  const message = result.data;
  const isForThisFilm =
    message.id === undefined
      ? !FILM_SCOPED_ACTIONS.has(message.action)
      : message.id === id;
  if (!isForThisFilm) {
    return undefined;
  }
  return message.requestKey === undefined
    ? { action: message.action, value: message.value }
    : {
        action: message.action,
        value: message.value,
        requestKey: message.requestKey,
      };
}
