import fs from "node:fs/promises";
import type { OwnedProjectArtifact } from "./createPrivateVideoProject.types";

/**
 * Writes a new storyboard through its exclusive handle and records ownership.
 */
export async function writeProjectStoryboard({
  filename,
  source,
  rememberArtifact,
}: Readonly<{
  filename: string;
  source: string;
  rememberArtifact: (artifact: OwnedProjectArtifact) => void;
}>): Promise<void> {
  const handle = await fs.open(filename, "wx");
  try {
    const stat = await handle.stat();
    rememberArtifact({ filename, device: stat.dev, inode: stat.ino });
    await handle.writeFile(source, "utf8");
  } finally {
    await handle.close();
  }
}
