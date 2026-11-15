import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const LINGUI_CLI = fileURLToPath(
  new URL("./lingui.js", import.meta.resolve("@lingui/cli")),
);
/** Generates and compiles the active gallery translation catalogs. */
export async function generateGalleryCopy(root) {
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
