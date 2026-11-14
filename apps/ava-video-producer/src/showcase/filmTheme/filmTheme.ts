import { z, ZodError } from "zod";
import { VideoThemeError } from "../../videoTheme/VideoThemeError/VideoThemeError";
import {
  parseVideoThemeDocument,
  VIDEO_THEME_SLUG_PATTERN,
  videoThemePatchSchema,
} from "../../videoTheme/videoThemeSchema/videoThemeSchema";
import {
  resolveVideoThemeFromSnapshot,
  type VideoThemeSnapshot,
} from "../../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import type {
  VideoThemeIssue,
  VideoThemePatch,
} from "../../videoTheme/videoTheme.types";

const snapshotSchema = z
  .object({
    themeId: z.string().regex(VIDEO_THEME_SLUG_PATTERN),
    documents: z.array(z.unknown()).max(8),
    patches: z.array(videoThemePatchSchema).max(4),
  })
  .strict();

/** The live player's answer to a theme: the resolved hash, or why it refused. */
export type FilmThemeAcknowledgement =
  | Readonly<{ type: "film-theme"; id: string; hash: string }>
  | Readonly<{
      type: "film-theme-error";
      id: string;
      issues: readonly VideoThemeIssue[];
    }>;

/** The tokens a live film has read so far. */
export type FilmTokensUsedMessage = Readonly<{
  type: "film-tokens-used";
  id: string;
  paths: readonly string[];
}>;

type UnknownRecord = Readonly<Record<string, unknown>>;

function _isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

/** Validates a snapshot that crossed a window boundary. Throws on any problem. */
export function parseVideoThemeSnapshot(value: unknown): VideoThemeSnapshot {
  const parsed = snapshotSchema.parse(value);
  return {
    themeId: parsed.themeId,
    documents: parsed.documents.map(parseVideoThemeDocument),
    patches: parsed.patches as VideoThemePatch[],
  };
}

function _issuesFromError(error: unknown): VideoThemeIssue[] {
  if (error instanceof VideoThemeError) {
    return [...error.issues];
  }
  if (error instanceof ZodError) {
    return error.issues.map((issue) => {
      return { path: issue.path.join("."), message: issue.message };
    });
  }
  return [
    {
      path: "",
      message: error instanceof Error ? error.message : String(error),
    },
  ];
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
  return { type: "film-tokens-used", id, paths };
}

/** Whether a posted message is a theme acknowledgement for this film. */
export function isFilmThemeAcknowledgement(
  data: unknown,
  id: string,
): data is FilmThemeAcknowledgement {
  return (
    _isRecord(data) &&
    data.id === id &&
    ((data.type === "film-theme" && typeof data.hash === "string") ||
      (data.type === "film-theme-error" && Array.isArray(data.issues)))
  );
}

/** Whether a posted message is a usage report for this film. */
export function isFilmTokensUsedMessage(
  data: unknown,
  id: string,
): data is FilmTokensUsedMessage {
  return (
    _isRecord(data) &&
    data.type === "film-tokens-used" &&
    data.id === id &&
    Array.isArray(data.paths) &&
    data.paths.every((path) => {
      return typeof path === "string";
    })
  );
}
