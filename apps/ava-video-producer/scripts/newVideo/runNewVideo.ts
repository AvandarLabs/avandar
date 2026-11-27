import path from "node:path";
import { fileURLToPath } from "node:url";
import { ProductSources } from "../lib/ProductSources";
import { createPrivateVideoProject } from "../newVideo/createPrivateVideoProject/createPrivateVideoProject";
import { requireLicense } from "../requireLicense";
import { CliOutput } from "../runProducerCommand/CliOutput/CliOutput.mjs";
import { ProducerCli } from "../runProducerCommand/ProducerCli/ProducerCli.mjs";

async function _createProject(): Promise<void> {
  requireLicense();
  const [name, ...extra] = process.argv.slice(2);
  if (!name || !/^[a-z][a-z0-9-]*$/.test(name) || extra.length) {
    throw new Error("Usage: pnpm video:new <project-name>");
  }
  const root = fileURLToPath(new URL("../../", import.meta.url));
  CliOutput.progress(`Creating private project ${name}.`);
  const project = await createPrivateVideoProject({
    root,
    privateRoot: path.join(
      ProductSources.getProductRootFromProducerRoot(root),
      ".videos",
    ),
    name,
  });
  CliOutput.success(
    `Created private project: ${project}\nRun: pnpm video preview ../../.videos/${name}/storyboard.json`,
  );
}

await _createProject().catch((error: unknown) => {
  ProducerCli.failure("video:new", error);
  process.exitCode = 1;
});
