import fs from "node:fs/promises";
import path from "node:path";
import { OwnedProjectArtifacts } from "./OwnedProjectArtifacts";
import { writeProjectStoryboard } from "./writeProjectStoryboard";
import type { OwnedProjectArtifact } from "./createPrivateVideoProject.types";

/** Cleans only owned output and describes any concurrently added content. */
async function _cleanFailedProject({
  project,
  artifacts,
}: Readonly<{
  project: string;
  artifacts: ReadonlyArray<OwnedProjectArtifact | undefined>;
}>): Promise<string> {
  for (const [index, artifact] of artifacts.entries()) {
    await OwnedProjectArtifacts.remove(artifact, index > 0);
  }
  const remaining = await OwnedProjectArtifacts.readIdentity(project);
  return remaining
    ? ` Existing contents were preserved at ${project}. Inspect them before choosing another project name.`
    : " The incomplete project was removed. Retry the same command.";
}

/** Returns the complete starter JSON before any output directory is claimed. */
async function _readStarter({
  root,
  name,
}: Readonly<{ root: string; name: string }>): Promise<string> {
  const plan: Record<string, unknown> = JSON.parse(
    await fs.readFile(
      path.join(root, "storyboards/motion-reference.json"),
      "utf8",
    ),
  );
  return `${JSON.stringify({ ...plan, id: name, title: name, description: "Local video project. Replace illustrative content with approved story content." }, null, 2)}\n`;
}

/**
 * Creates a private project and returns its path, preserving existing output.
 */
export async function createPrivateVideoProject({
  root,
  privateRoot,
  name,
}: Readonly<{
  root: string;
  privateRoot: string;
  name: string;
}>): Promise<string> {
  const source = await _readStarter({ root, name });
  await fs.mkdir(privateRoot, { recursive: true });
  if ((await fs.lstat(privateRoot)).isSymbolicLink()) {
    throw new Error(".videos cannot be a symlink");
  }
  const project = path.join(privateRoot, name);
  await fs.mkdir(project);
  const ownedProject = await OwnedProjectArtifacts.readIdentity(project);
  if (!ownedProject) {
    throw new Error(
      `Project ownership changed at ${project}. No existing contents were removed.`,
    );
  }
  let ownedPublic: OwnedProjectArtifact | undefined;
  let ownedStoryboard: OwnedProjectArtifact | undefined;
  try {
    const publicDirectory = path.join(project, "public");
    await fs.mkdir(publicDirectory);
    ownedPublic = await OwnedProjectArtifacts.readIdentity(publicDirectory);
    await writeProjectStoryboard({
      filename: path.join(project, "storyboard.json"),
      source,
      rememberArtifact: (artifact) => {
        ownedStoryboard = artifact;
      },
    });
    return project;
  } catch (error) {
    const cleanup = await _cleanFailedProject({
      project,
      artifacts: [ownedStoryboard, ownedPublic, ownedProject],
    });
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}${cleanup}`,
      { cause: error },
    );
  }
}
