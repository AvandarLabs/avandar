import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { ZodError } from "zod";
import {
  BUILT_IN_VIDEO_THEME_IDS,
  createVideoThemeLibrary,
} from "../../../src/videoTheme/builtInVideoThemes/builtInVideoThemes";
import { DRAFT_THEME_ID } from "../../../src/videoTheme/createDraftThemeTarget/createDraftThemeTarget";
import { resolveVideoTheme } from "../../../src/videoTheme/resolveVideoTheme/resolveVideoTheme";
import { VideoThemeError } from "../../../src/videoTheme/VideoThemeError/VideoThemeError";
import {
  parseVideoThemeDocument,
  VIDEO_THEME_MAX_BYTES,
  VIDEO_THEME_SLUG_PATTERN,
} from "../../../src/videoTheme/videoThemeSchema/videoThemeSchema";
import type {
  VideoThemeDocument,
  VideoThemeIssue,
} from "../../../src/videoTheme/videoTheme.types";

/** Largest theme file the store writes, and the largest body the routes read. */
export const THEME_FILE_MAX_BYTES = VIDEO_THEME_MAX_BYTES;
const THEME_FILE_SUFFIX = ".theme.json";

/** One theme in the theme picker. */
export type ThemeSummary = Readonly<{
  id: string;
  label: string;
  builtIn: boolean;
  extends?: string;
}>;

/** A theme file's document and the hash of its bytes, used for `If-Match`. */
export type StoredTheme = Readonly<{
  document: VideoThemeDocument;
  hash: string;
}>;

/** Theme file operations over one `themes/` directory. */
export type ThemeStore = Readonly<{
  list: () => Promise<readonly ThemeSummary[]>;
  read: (id: string) => Promise<StoredTheme>;
  create: (document: unknown) => Promise<StoredTheme>;
  save: (
    id: string,
    document: unknown,
    ifMatch: string,
  ) => Promise<StoredTheme>;
}>;

/** A refused theme operation, with the HTTP status the routes send. */
export class ThemeStoreError extends Error {
  readonly status: 400 | 403 | 404 | 409 | 413 | 428;
  readonly issues: readonly VideoThemeIssue[];

  constructor(
    status: ThemeStoreError["status"],
    message: string,
    issues: readonly VideoThemeIssue[] = [],
  ) {
    super(message);
    this.name = "ThemeStoreError";
    this.status = status;
    this.issues = issues;
  }
}

function _hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function _isBuiltIn(id: string): boolean {
  return (BUILT_IN_VIDEO_THEME_IDS as readonly string[]).includes(id);
}

// The draft rule renders a built-in theme's unsaved edits under this id, so a
// file with it would collide with every such draft.
function _assertNotReserved(id: string): void {
  if (id === DRAFT_THEME_ID) {
    throw new ThemeStoreError(
      400,
      "That theme id is reserved for unsaved edits. Choose another name.",
    );
  }
}

function _parse(value: unknown): VideoThemeDocument {
  try {
    return parseVideoThemeDocument(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ThemeStoreError(
        400,
        "The theme does not match the theme schema",
        error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      );
    }
    throw error;
  }
}

function _assertResolves(
  document: VideoThemeDocument,
  others: readonly VideoThemeDocument[],
) {
  const library = createVideoThemeLibrary([
    ...others.filter((other) => other.id !== document.id),
    document,
  ]);
  try {
    resolveVideoTheme(library, document.id);
    for (const overrideId of Object.keys(document.overrides ?? {})) {
      resolveVideoTheme(library, document.id, { overrideIds: [overrideId] });
    }
  } catch (error) {
    if (error instanceof VideoThemeError) {
      throw new ThemeStoreError(
        400,
        "The theme has token errors",
        error.issues,
      );
    }
    throw error;
  }
}

// Checked before validation, which resolves every override and is slow on a
// huge file.
function _serializeWithinCap(document: VideoThemeDocument): string {
  const text = `${JSON.stringify(document, null, 2)}\n`;
  if (Buffer.byteLength(text) > THEME_FILE_MAX_BYTES) {
    throw new ThemeStoreError(413, "Themes are limited to 256 KB");
  }
  return text;
}

async function _writeAtomically(file: string, text: string): Promise<void> {
  const temporary = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${randomUUID()}.tmp`,
  );
  try {
    await fs.writeFile(temporary, text);
    await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

function _fileFromId(directory: string, id: string): string {
  if (!VIDEO_THEME_SLUG_PATTERN.test(id)) {
    throw new ThemeStoreError(
      400,
      "Theme ids are 1 to 48 lowercase letters, digits, or hyphens",
    );
  }
  return path.join(directory, `${id}${THEME_FILE_SUFFIX}`);
}

async function _readTheme(directory: string, id: string): Promise<StoredTheme> {
  const text = await fs
    .readFile(_fileFromId(directory, id), "utf8")
    .catch((error: NodeJS.ErrnoException) => {
      throw error.code === "ENOENT"
        ? new ThemeStoreError(404, `No theme named "${id}"`)
        : error;
    });
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ThemeStoreError(
      400,
      `themes/${id}${THEME_FILE_SUFFIX} is not valid JSON`,
    );
  }
  return { document: _parse(value), hash: _hashText(text) };
}

async function _readAllThemes(
  directory: string,
): Promise<VideoThemeDocument[]> {
  const names = (await fs.readdir(directory)).filter(
    (name) => name.endsWith(THEME_FILE_SUFFIX) && !name.startsWith("."),
  );
  const results = await Promise.all(
    names.map((name) =>
      _readTheme(directory, name.slice(0, -THEME_FILE_SUFFIX.length)).catch(
        (error: unknown) => {
          console.error(`Skipping invalid theme ${name}:`, error);
          return undefined;
        },
      ),
    ),
  );
  return results.flatMap((result) => (result ? [result.document] : []));
}

async function _writeTheme(
  directory: string,
  document: VideoThemeDocument,
  text: string,
): Promise<StoredTheme> {
  await _writeAtomically(_fileFromId(directory, document.id), text);
  return { document, hash: _hashText(text) };
}

function _documentToSummary(document: VideoThemeDocument): ThemeSummary {
  return {
    id: document.id,
    label: document.label,
    builtIn: _isBuiltIn(document.id),
    ...(document.extends ? { extends: document.extends } : {}),
  };
}

/**
 * Reads and writes `themes/<id>.theme.json` for the showcase routes. Every
 * write validates the schema, references, and cycles, refuses built-in
 * themes and stale `If-Match` hashes, caps the file at 256 KB, and replaces
 * the file atomically.
 */
export function createThemeStore(
  options: Readonly<{ directory: string }>,
): ThemeStore {
  const { directory } = options;
  return {
    list: async () =>
      (await _readAllThemes(directory))
        .map(_documentToSummary)
        .sort(
          (left, right) =>
            Number(right.builtIn) - Number(left.builtIn) ||
            left.label.localeCompare(right.label),
        ),
    read: (id) => _readTheme(directory, id),
    create: async (value) => {
      const document = _parse(value);
      _assertNotReserved(document.id);
      const text = _serializeWithinCap(document);
      const isTaken = await fs.access(_fileFromId(directory, document.id)).then(
        () => true,
        () => false,
      );
      if (isTaken) {
        throw new ThemeStoreError(
          409,
          `A theme named "${document.id}" already exists`,
        );
      }
      _assertResolves(document, await _readAllThemes(directory));
      return _writeTheme(directory, document, text);
    },
    save: async (id, value, ifMatch) => {
      _assertNotReserved(id);
      if (_isBuiltIn(id)) {
        throw new ThemeStoreError(
          403,
          "Built-in themes are read-only. Save a copy as a new theme.",
        );
      }
      const document = _parse(value);
      if (document.id !== id) {
        throw new ThemeStoreError(
          400,
          "A theme's id cannot change when it is saved",
        );
      }
      const text = _serializeWithinCap(document);
      if ((await _readTheme(directory, id)).hash !== ifMatch) {
        throw new ThemeStoreError(
          409,
          "The theme changed on disk. Reload it before saving.",
        );
      }
      _assertResolves(document, await _readAllThemes(directory));
      return _writeTheme(directory, document, text);
    },
  };
}
