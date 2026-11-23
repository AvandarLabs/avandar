import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const APP_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

function _getCurveAdoptionScript(helperUrl: string): string {
  return [
    'import assert from "node:assert/strict";',
    'import fs from "node:fs";',
    'import { pathToFileURL } from "node:url";',
    `const { writeCurves } = await import(${JSON.stringify(helperUrl)});`,
    'const filename = new URL("src/motion.ts", pathToFileURL(process.cwd() + "/"));',
    'const beforeSource = fs.readFileSync(filename, "utf8");',
    "const before = await import(filename.href);",
    'const easings = [{ name: "--ease-out-expo", controlPoints: [0.1, 0.1, 0.9, 0.9] }];',
    "assert.equal(writeCurves({ isDryRun: true, easings }), 1);",
    'assert.equal(fs.readFileSync(filename, "utf8"), beforeSource);',
    "assert.equal(writeCurves({ isDryRun: false, easings }), 1);",
    'const after = await import(filename.href + "?after");',
    "assert.ok(Math.abs(after.EASE.out(0.25) - 0.25) < 1e-6);",
    "assert.ok(Math.abs(before.EASE.out(0.25) - 0.25) > 0.1);",
    "assert.equal(after.EASE.word(0.25), before.EASE.word(0.25));",
  ].join("\n");
}

test("curve adoption updates the selected portable easing without changing other curves", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "motion-curves-"));
  try {
    await fs.mkdir(path.join(directory, "src"));
    await fs.writeFile(
      path.join(directory, "package.json"),
      JSON.stringify({ type: "module" }),
    );
    const source = await fs.readFile(
      path.join(APP_ROOT, "src/motion.ts"),
      "utf8",
    );
    await fs.writeFile(path.join(directory, "src/motion.ts"), source);
    const helperUrl = pathToFileURL(
      path.join(
        APP_ROOT,
        "scripts/adoptTheme/themeOutputHelpers/themeOutputHelpers.ts",
      ),
    ).href;
    const script = _getCurveAdoptionScript(helperUrl);
    execFileSync(
      process.execPath,
      [
        "--import",
        import.meta.resolve("tsx"),
        "--input-type=module",
        "--eval",
        script,
      ],
      {
        cwd: directory,
        encoding: "utf8",
        env: {
          ...process.env,
          TSX_TSCONFIG_PATH: path.join(APP_ROOT, "tsconfig.json"),
        },
      },
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
