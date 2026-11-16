import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getProductRootFromProducerRoot } from "./lib/productSourceHelpers";
import { requireLicense } from "./requireLicense";

// `pnpm video:new <project-name>`: creates a private `.videos/<name>/` project
// seeded from the motion reference storyboard.

/** Creates the project folder and its starter storyboard, never overwriting. */
async function _createProject(name: string): Promise<string> {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const privateRoot = path.join(
    getProductRootFromProducerRoot(root),
    ".videos",
  );
  await fs.mkdir(privateRoot, { recursive: true });
  if ((await fs.lstat(privateRoot)).isSymbolicLink()) {
    throw new Error(".videos cannot be a symlink");
  }
  const project = path.join(privateRoot, name);
  await fs.mkdir(project);
  await fs.mkdir(path.join(project, "public"));
  const plan: Record<string, unknown> = JSON.parse(
    await fs.readFile(
      path.join(root, "storyboards/motion-reference.json"),
      "utf8",
    ),
  );
  const projectPlan = {
    ...plan,
    id: name,
    title: name,
    description:
      "Local video project. Replace illustrative content with approved story content.",
  };
  await fs.writeFile(
    path.join(project, "storyboard.json"),
    `${JSON.stringify(projectPlan, null, 2)}\n`,
    { flag: "wx" },
  );
  return project;
}

requireLicense();
const [name, ...extra] = process.argv.slice(2);
if (!name || !/^[a-z][a-z0-9-]*$/.test(name) || extra.length) {
  throw new Error("Usage: pnpm video:new <project-name>");
}
const project = await _createProject(name);
console.log(
  `Created private project: ${project}\nRun: pnpm video preview ../../.videos/${name}/storyboard.json`,
);
