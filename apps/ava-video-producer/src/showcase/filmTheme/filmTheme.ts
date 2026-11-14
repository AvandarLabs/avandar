import { z, ZodError } from "zod";
import { VideoThemeError } from "../../videoTheme/VideoThemeError/VideoThemeError";
import {
  VIDEO_THEME_MAX_BYTES,
  VIDEO_THEME_SLUG_PATTERN,
  videoThemeDocumentSchema,
  videoThemePatchSchema,
} from "../../videoTheme/videoThemeSchema/videoThemeSchema";
import {
  resolveVideoThemeFromSnapshot,
  type VideoThemeSnapshot,
} from "../../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import type { VideoThemeIssue } from "../../videoTheme/videoTheme.types";

const MAX_ISSUES = 100;
const MAX_ISSUE_PATH_LENGTH = 512;
const MAX_ISSUE_MESSAGE_LENGTH = 1000;
const MAX_TOKEN_PATHS = 4096;
const MAX_TOKEN_PATH_LENGTH = 256;

/** Issue messages for failures that carry no theme issue of their own. */
const PAYLOAD_TOO_LARGE = "payload-too-large";
const PAYLOAD_UNREADABLE = "payload-unreadable";
const THEME_UNRESOLVABLE = "theme-unresolvable";

const snapshotSchema = z.strictObject({
  themeId: z.string().regex(VIDEO_THEME_SLUG_PATTERN),
  documents: z.array(videoThemeDocumentSchema).max(8),
  patches: z.array(videoThemePatchSchema).max(4),
});

const issueSchema = z.strictObject({
  path: z.string().max(MAX_ISSUE_PATH_LENGTH),
  message: z.string().max(MAX_ISSUE_MESSAGE_LENGTH),
});

const acknowledgementSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("film-theme"),
    id: z.string(),
    hash: z.string(),
  }),
  z.strictObject({
    type: z.literal("film-theme-error"),
    id: z.string(),
    issues: z.array(issueSchema).max(MAX_ISSUES),
  }),
]);

const tokensUsedSchema = z.strictObject({
  type: z.literal("film-tokens-used"),
  id: z.string(),
  paths: z.array(z.string().max(MAX_TOKEN_PATH_LENGTH)).max(MAX_TOKEN_PATHS),
});

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

/**
 * What the live player does with a `theme` message: the snapshot to apply
 * when it resolves, and the acknowledgement to post back either way.
 */
export function createFilmThemeAcknowledgement(
  id: string,
  value: unknown,
): Readonly<{
  snapshot?: VideoThemeSnapshot;
  message: FilmThemeAcknowledgement;
}> {
  const payloadIssue = _payloadIssue(value);
  if (payloadIssue) {
    return {
      message: { type: "film-theme-error", id, issues: [payloadIssue] },
    };
  }
  try {
    const snapshot = parseVideoThemeSnapshot(value);
    // The film root resolves with the film id as its override scope, so the
    // hash matches the picture.
    const { hash } = resolveVideoThemeFromSnapshot(snapshot, [id]);
    return { snapshot, message: { type: "film-theme", id, hash } };
  } catch (error) {
    return {
      message: {
        type: "film-theme-error",
        id,
        issues: _issuesFromError(error),
      },
    };
  }
}

/** The usage message the live player posts as its film reads tokens. */
export function createFilmTokensUsedMessage(
  id: string,
  paths: readonly string[],
): FilmTokensUsedMessage {
  return { type: "film-tokens-used", id, paths: [...paths] };
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
