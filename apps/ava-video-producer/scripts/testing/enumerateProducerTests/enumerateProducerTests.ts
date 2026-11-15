import fs from "node:fs/promises";
import path from "node:path";

async function _enumerate(
  options: Readonly<{ root: string; directory: string; recursive: boolean }>,
): Promise<string[]> {
  const entries = await fs
    .readdir(path.join(options.root, options.directory), {
      withFileTypes: true,
    })
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const filename = path.join(options.directory, entry.name);
      if (
        entry.isDirectory() &&
        options.recursive &&
        !entry.name.startsWith(".") &&
        !["node_modules", "out", "dist", "generated"].includes(entry.name)
      ) {
        return _enumerate({ ...options, directory: filename });
      }
      return entry.isFile() && /\.test\.(?:[cm]?js|tsx?)$/.test(entry.name)
        ? [filename]
        : [];
    }),
  );
  return files.flat();
}

/**
 * Enumerates only producer-owned unit test sources, without following links.
 */
export async function enumerateProducerTests(root: string): Promise<string[]> {
  const trees = await Promise.all([
    ...["src", "scripts", "tests/helpers", "avandar-adapter"].map((directory) =>
      _enumerate({ root, directory, recursive: true }),
    ),
    ...["tests", "showcase"].map((directory) =>
      _enumerate({ root, directory, recursive: false }),
    ),
  ]);
  return trees.flat().sort();
}
