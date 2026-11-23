import { execFileSync } from "node:child_process";
import path from "node:path";

/** Returns the current branch name as a safe screenshot folder name. */
function _getBranchFolderName(): string {
  const branch = execFileSync("git", ["branch", "--show-current"], {
    cwd: import.meta.dirname,
    encoding: "utf8",
  });
  const folderName = branch
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return folderName || "local";
}

const BRANCH_DIRECTORY = path.resolve(
  import.meta.dirname,
  "../../../../.temp",
  _getBranchFolderName(),
);

/** Screenshot paths inside the repository's ignored branch directory. */
export const ShowcaseScreenshots = {
  /** Returns a screenshot path, optionally grouped beneath a run label. */
  getPathFromFilename: ({
    filename,
    label,
  }: Readonly<{ filename: string; label?: string }>): string => {
    return label
      ? path.join(BRANCH_DIRECTORY, label, filename)
      : path.join(BRANCH_DIRECTORY, filename);
  },
};
