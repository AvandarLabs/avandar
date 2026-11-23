import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readdirSync,
  rmSync,
  mkdirSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";

/** Source and tarball exports must both remain usable by actual consumers. */
it("repairs function comments through the source export without a build", () => {
  const source = "function load() {\n  /* Read once. */\n  console.log(1);\n}";
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import plugin from '@avandar/lint-typescript/oxlint';
       import { Linter } from 'eslint';
       const result = new Linter().verifyAndFix(${JSON.stringify(source)}, [{
         plugins: { avandar: plugin },
         rules: { 'avandar/function-body-line-comments': 'error' }
       }]);
       console.log(JSON.stringify(result.output));`,
    ],
    { encoding: "utf8" },
  );
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toBe(
    "function load() {\n  // Read once.\n  console.log(1);\n}",
  );
});

it("repairs CSS comments through the source export without a build", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import plugins from "@avandar/lint-css/stylelint";
       import stylelint from "stylelint";
       const result = await stylelint.lint({code: "/*Read once.*/\\n", fix: true,
         config: { plugins, rules: { "avandar/canonical-block-comments": true } }});
       console.log(JSON.stringify(result.code));`,
    ],
    { encoding: "utf8" },
  );
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toBe("/* Read once. */\n");
});

it("resolves the catalog export from the packed tarball", () => {
  const directory = mkdtempSync(join(tmpdir(), "avandar-lint-pack-"));
  try {
    const root = resolve(import.meta.dirname, "..");
    const build = spawnSync("pnpm", ["build"], { cwd: root, encoding: "utf8" });
    expect(build.status, build.stdout + build.stderr).toBe(0);
    const pack = spawnSync("pnpm", ["pack", "--pack-destination", directory], {
      cwd: root,
      encoding: "utf8",
    });
    expect(pack.status, pack.stderr).toBe(0);
    const unpack = spawnSync(
      "tar",
      [
        "-xzf",
        join(
          directory,
          readdirSync(directory).find((name) => {
            return name.endsWith(".tgz");
          })!,
        ),
        "-C",
        directory,
      ],
      { encoding: "utf8" },
    );
    expect(unpack.status, unpack.stderr).toBe(0);
    mkdirSync(join(directory, "node_modules/@avandar"), { recursive: true });
    symlinkSync(
      join(directory, "package"),
      join(directory, "node_modules/@avandar/lint"),
    );
    ["ajv", "yaml"].forEach((dependency) => {
      symlinkSync(
        resolve(import.meta.dirname, "../node_modules", dependency),
        join(directory, "node_modules", dependency),
      );
    });
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "import {loadRuleCatalog} from '@avandar/lint/catalog'; console.log(loadRuleCatalog().rules.length)",
      ],
      { cwd: directory, encoding: "utf8" },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(Number(result.stdout)).toBe(90);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 30000);
