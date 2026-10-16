import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { productRoot } from "./lib/product-source.mjs";
import { requireLicense } from "./require-license.mjs";

requireLicense();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [name, ...extra] = process.argv.slice(2);
if (!name || !/^[a-z][a-z0-9-]*$/.test(name) || extra.length)
  throw new Error("Usage: pnpm video:new <project-name>");
const privateRoot = path.join(productRoot(root), ".videos");
await fs.mkdir(privateRoot, { recursive: true });
if ((await fs.lstat(privateRoot)).isSymbolicLink())
  throw new Error(".videos cannot be a symlink");
const project = path.join(privateRoot, name);
await fs.mkdir(project);
await fs.mkdir(path.join(project, "public"));
const plan = JSON.parse(
  await fs.readFile(
    path.join(root, "storyboards/motion-reference.json"),
    "utf8",
  ),
);
plan.id = name;
plan.title = name;
plan.description =
  "Local video project. Replace illustrative content with approved story content.";
await fs.writeFile(
  path.join(project, "storyboard.json"),
  JSON.stringify(plan, null, 2) + "\n",
  { flag: "wx" },
);
console.log(
  `Created private project: ${project}\nRun: pnpm video preview ../../.videos/${name}/storyboard.json`,
);
