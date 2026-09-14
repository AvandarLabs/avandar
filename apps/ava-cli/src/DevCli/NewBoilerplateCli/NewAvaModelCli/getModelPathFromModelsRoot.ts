import * as path from "node:path";

/**
 * Returns the path under `shared/models/` for `$` imports (POSIX, no
 * leading `./`).
 */
export function getModelPathFromModelsRoot(options: {
  modelsDirRelative: string;
  modelName: string;
}): string {
  const folder = path.join(options.modelsDirRelative, options.modelName);
  const rel = path.relative("shared/models", folder);
  return rel.split(path.sep).join("/");
}
