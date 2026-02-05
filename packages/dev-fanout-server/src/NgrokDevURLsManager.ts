import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import z from "zod";

const NGROK_DEV_URLS_FILE_PATH = "/data/ngrok-dev-urls.json";

export type NgrokDevURLTarget = Readonly<{
  url: string;
  dateAdded: string;
  lastAccessedDate: string | null;
}>;

const NgrokDevURLsFileSchema = z.object({
  targets: z.array(
    z.object({
      url: z.url(),
      dateAdded: z.iso.datetime({ offset: true }),
      lastAccessedDate: z.iso.datetime({ offset: true }).nullable(),
    }),
  ),
});

/**
 * Read all registered dev target URLs from `ngrok-dev-urls.json`.
 *
 * If the file does not exist, this returns an empty list.
 */
async function readNgrokDevURLs(): Promise<readonly NgrokDevURLTarget[]> {
  try {
    const rawFile: string = await readFile(NGROK_DEV_URLS_FILE_PATH, "utf8");
    const json: unknown = JSON.parse(rawFile);

    const parsed = NgrokDevURLsFileSchema.parse(json);
    return parsed.targets;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: unknown }).code === "ENOENT"
    ) {
      return [];
    }
    throw error;
  }
}

/**
 * Persist the dev target URLs to `ngrok-dev-urls.json`.
 *
 * This writes atomically by writing a temp file and then renaming it.
 */
async function writeNgrokDevURLs(options: {
  targets: readonly NgrokDevURLTarget[];
}): Promise<void> {
  const dirPath: string = path.dirname(NGROK_DEV_URLS_FILE_PATH);

  // create the intermediate directories if they don't exist yet
  await mkdir(dirPath, { recursive: true });

  const suffix = `${Date.now()}-${process.pid}`;
  const tempFilePath = `${NGROK_DEV_URLS_FILE_PATH}.${suffix}.tmp`;
  const contents: string = JSON.stringify(
    {
      targets: [...options.targets],
    },
    null,
    2,
  );

  await writeFile(tempFilePath, `${contents}\n`, "utf8");
  await rename(tempFilePath, NGROK_DEV_URLS_FILE_PATH);
}

/**
 * Set `lastAccessedDate` for the given URLs, if they exist.
 *
 * @param options The options to update access times.
 * @param options.urls The dev URLs to mark as accessed.
 * @param options.lastAccessedDate Full ISO timestamp.
 */
async function setLastAccessedDates(options: {
  urls: readonly string[];
  lastAccessedDate: string;
}): Promise<void> {
  if (options.urls.length === 0) {
    return;
  }

  const existingTargets: readonly NgrokDevURLTarget[] =
    await readNgrokDevURLs();
  const urlsToUpdate: Set<string> = new Set(options.urls);
  let hasSomethingChanged: boolean = false;

  const updatedTargets: readonly NgrokDevURLTarget[] = existingTargets.map(
    (target) => {
      if (
        !urlsToUpdate.has(target.url) ||
        target.lastAccessedDate === options.lastAccessedDate
      ) {
        return target;
      }

      hasSomethingChanged = true;
      return {
        ...target,
        lastAccessedDate: options.lastAccessedDate,
      };
    },
  );

  if (hasSomethingChanged) {
    await writeNgrokDevURLs({ targets: updatedTargets });
  }
}

export const NgrokDevURLsManager = {
  readNgrokDevURLs,
  writeNgrokDevURLs,
  setLastAccessedDates,
};
