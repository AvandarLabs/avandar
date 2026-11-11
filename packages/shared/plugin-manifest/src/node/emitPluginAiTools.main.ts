import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { emitPluginAiToolsFile } from "@plugin-manifest/node/emitPluginAiTools.ts";

// Command entry point: `pnpm vite-script` runs this file to rewrite the
// generated tool list. It is separate from `emitPluginAiTools.ts` so that
// importing the emitter never writes the file.
const repoRoot = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../..",
);
writeFileSync(
  join(repoRoot, "shared/agent/dataAgent/pluginAiTools.gen.ts"),
  emitPluginAiToolsFile(repoRoot),
);
