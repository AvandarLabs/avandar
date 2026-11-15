import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tsImport } from "tsx/esm/api";
const LINGUI_CLI = fileURLToPath(
  new URL("./lingui.js", import.meta.resolve("@lingui/cli")),
);
const { buildStockMessages } = await tsImport(
  "../stock/buildStockMessages/buildStockMessages.ts",
  import.meta.url,
);
/** Generates and compiles the active gallery translation catalogs. */
export async function generateGalleryCopy(root) {
  await buildStockMessages(root);
  execFileSync(
    process.execPath,
    [LINGUI_CLI, "extract", "--config", "lingui.gallery.config.ts"],
    {
      cwd: root,
      stdio: "pipe",
    },
  );
  execFileSync(
    process.execPath,
    [LINGUI_CLI, "compile", "--config", "lingui.gallery.config.ts"],
    {
      cwd: root,
      stdio: "pipe",
    },
  );
}
