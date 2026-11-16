import { spawnSync } from "node:child_process";
import { requireLicense } from "../requireLicense";
import { enumerateProducerTests } from "./enumerateProducerTests/enumerateProducerTests";

requireLicense();
const files: string[] = await enumerateProducerTests(process.cwd());
const result: ReturnType<typeof spawnSync> = spawnSync(
  process.execPath,
  [
    "--import",
    "tsx",
    "--import",
    "./scripts/yaml/registerYaml.ts",
    "--test",
    ...process.argv.slice(2),
    ...files,
  ],
  { stdio: "inherit" },
);
if (result.error) {
  throw result.error;
}
process.exitCode = result.status ?? 1;
