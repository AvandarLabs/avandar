import type {
  ThemeSummary,
  StoredTheme,
  ThemeStore,
} from "./createThemeStore.types";

export type {
  ThemeSummary,
  StoredTheme,
  ThemeStore,
} from "./createThemeStore.types";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { propNotEq } from "@avandar/utils";
import { ZodError } from "zod";
import { DRAFT_THEME_ID } from "../../../src/videoTheme/makeDraftThemeTargetFromLibrary/makeDraftThemeTargetFromLibrary";
import { makeResolvedVideoThemeFromLibrary } from "../../../src/videoTheme/makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import {
  BUILT_IN_VIDEO_THEME_IDS,
  makeVideoThemeLibraryFromDocuments,
} from "../../../src/videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { VideoThemeError } from "../../../src/videoTheme/VideoThemeError";
import {
  VIDEO_THEME_MAX_BYTES,
  VIDEO_THEME_SLUG_PATTERN,
  VideoThemeSchemas,
} from "../../../src/videoTheme/VideoThemeSchemas/VideoThemeSchemas";
import { ThemeStoreError } from "../ThemeStoreError";
import { makeValueFromStoredThemeText } from "./makeValueFromStoredThemeText";
import { writeThemeFileAtomically } from "./writeThemeFileAtomically";
import type { VideoThemeDocument } from "../../../src/videoTheme/videoTheme.types";

async function _createStoredTheme({
  directory,
  value,
  runExclusively,
}: Readonly<{
  directory: string;
  value: unknown;
  runExclusively: ReturnType<typeof _createWriteQueue>;
}>): Promise<StoredTheme> {
  const document = _parse(value);
  _assertNotReserved(document.id);
  const text = _serializeWithinCap(document);
  return runExclusively(document.id, async () => {
    const isTaken = await fs
      .access(
        _fileFromId({
          directory,
          id: document.id,
        }),
      )
      .then(
        () => {
          return true;
        },
        () => {
          return false;
        },
      );
    if (isTaken) {
      throw new ThemeStoreError(
        409,
        `A theme named "${document.id}" already exists`,
      );
    }
    _assertResolves({
      document,
      others: await _readAllThemes(directory),
    });
    return _writeTheme({ directory, document, text, mode: "create" });
  });
}
/**
 * Largest theme file the store writes, and the largest body the routes read.
 */
export const THEME_FILE_MAX_BYTES = VIDEO_THEME_MAX_BYTES;
const THEME_FILE_SUFFIX = ".theme.json";
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
    return VideoThemeSchemas.parseVideoThemeDocument(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ThemeStoreError(
        400,
        "The theme does not match the theme schema",
        error.issues.map((issue) => {
          return {
            path: issue.path.join("."),
            message: issue.message,
          };
        }),
      );
    }
    throw error;
  }
}
function _assertResolves({
  document,
  others,
}: Readonly<{
  document: VideoThemeDocument;
  others: readonly VideoThemeDocument[];
}>) {
  const library = makeVideoThemeLibraryFromDocuments([
    ...others.filter(propNotEq("id", document.id)),
    document,
  ]);
  try {
    makeResolvedVideoThemeFromLibrary({
      library,
      themeId: document.id,
    });
    Object.keys(document.overrides ?? {}).forEach((overrideId) => {
      makeResolvedVideoThemeFromLibrary({
        library,
        themeId: document.id,
        scope: {
          overrideIds: [overrideId],
        },
      });
    });
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
function _fileFromId({
  directory,
  id,
}: Readonly<{
  directory: string;
  id: string;
}>): string {
  if (!VIDEO_THEME_SLUG_PATTERN.test(id)) {
    throw new ThemeStoreError(
      400,
      "Theme ids are 1 to 48 lowercase letters, digits, or hyphens",
    );
  }
  return path.join(directory, `${id}${THEME_FILE_SUFFIX}`);
}
async function _readTheme({
  directory,
  id,
}: Readonly<{
  directory: string;
  id: string;
}>): Promise<StoredTheme> {
  // A hand-placed file under the reserved id would collide with every
  // built-in theme's draft, so the store treats it as absent.
  if (id === DRAFT_THEME_ID) {
    throw new ThemeStoreError(404, `No theme named "${id}"`);
  }
  const text = await fs
    .readFile(
      _fileFromId({
        directory,
        id,
      }),
      "utf8",
    )
    .catch((error: NodeJS.ErrnoException) => {
      throw error.code === "ENOENT"
        ? new ThemeStoreError(404, `No theme named "${id}"`)
        : error;
    });
  const value = makeValueFromStoredThemeText({ text, id });
  const document = _parse(value);
  // Every lookup is by file name, so a document under another id would be
  // listed but never found, breaking each render that loads the library.
  if (document.id !== id) {
    throw new ThemeStoreError(
      400,
      `themes/${id}${THEME_FILE_SUFFIX} must have the id "${id}"`,
    );
  }
  return { document, hash: _hashText(text) };
}
async function _readAllThemes(
  directory: string,
): Promise<VideoThemeDocument[]> {
  const names = (await fs.readdir(directory)).filter((name) => {
    return (
      name.endsWith(THEME_FILE_SUFFIX) &&
      !name.startsWith(".") &&
      name !== `${DRAFT_THEME_ID}${THEME_FILE_SUFFIX}`
    );
  });
  const results = await Promise.all(
    names.map((name) => {
      return _readTheme({
        directory,
        id: name.slice(0, -THEME_FILE_SUFFIX.length),
      }).catch((error: unknown) => {
        console.error(`Skipping invalid theme ${name}:`, error);
        return undefined;
      });
    }),
  );
  return results.flatMap((result) => {
    return result ? [result.document] : [];
  });
}
async function _writeTheme({
  directory,
  document,
  text,
  mode,
}: Readonly<{
  directory: string;
  document: VideoThemeDocument;
  text: string;
  mode: "replace" | "create";
}>): Promise<StoredTheme> {
  try {
    await writeThemeFileAtomically({
      file: _fileFromId({
        directory,
        id: document.id,
      }),
      text,
      mode,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new ThemeStoreError(
        409,
        `A theme named "${document.id}" already exists`,
      );
    }
    throw error;
  }
  return { document, hash: _hashText(text) };
}
/**
 * Runs writes to one theme id one after another, so a check made at the
 * start of a write still holds when the file is written. A failed write does
 * not stop the ones queued behind it. Writes to other ids run alongside.
 */
function _createWriteQueue() {
  const tails = new Map<string, Promise<unknown>>();
  return <Result>(id: string, task: () => Promise<Result>): Promise<Result> => {
    const result = (tails.get(id) ?? Promise.resolve()).then(task);
    const tail = result.then(
      () => {
        return undefined;
      },
      () => {
        return undefined;
      },
    );
    tails.set(id, tail);
    void tail.then(() => {
      if (tails.get(id) === tail) {
        tails.delete(id);
      }
    });
    return result;
  };
}
function _documentToSummary(document: VideoThemeDocument): ThemeSummary {
  return {
    id: document.id,
    label: document.label,
    builtIn: _isBuiltIn(document.id),
    ...(document.extends ? { extends: document.extends } : {}),
  };
}
/** Saves a custom theme in place when `ifMatch` is the file's current hash. */
async function _saveTheme({
  directory,
  id,
  value,
  ifMatch,
}: Readonly<{
  directory: string;
  id: string;
  value: unknown;
  ifMatch: string;
}>): Promise<StoredTheme> {
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
  if (
    (
      await _readTheme({
        directory,
        id,
      })
    ).hash !== ifMatch
  ) {
    throw new ThemeStoreError(
      409,
      "The theme changed on disk. Reload it before saving.",
    );
  }
  _assertResolves({
    document,
    others: await _readAllThemes(directory),
  });
  return _writeTheme({ directory, document, text, mode: "replace" });
}
/**
 * Reads and writes `themes/<id>.theme.json` for the showcase routes. Every
 * write validates the schema, references, and cycles, refuses built-in
 * themes and stale `If-Match` hashes, caps the file at 256 KB, and replaces
 * the file atomically.
 */
export function createThemeStore(
  options: Readonly<{
    directory: string;
  }>,
): ThemeStore {
  const { directory } = options;
  const runExclusively = _createWriteQueue();
  return {
    list: async () => {
      return (await _readAllThemes(directory))
        .map(_documentToSummary)
        .sort((left, right) => {
          return (
            Number(right.builtIn) - Number(left.builtIn) ||
            left.label.localeCompare(right.label)
          );
        });
    },
    read: (id) => {
      return _readTheme({
        directory,
        id,
      });
    },
    create: async (value) => {
      return _createStoredTheme({ directory, value, runExclusively });
    },
    save: (id, value, ifMatch) => {
      return runExclusively(id, () => {
        return _saveTheme({ directory, id, value, ifMatch });
      });
    },
  };
}
