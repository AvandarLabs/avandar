import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, expect, it } from "vitest";
import { runCli } from "../../../src/cli/main";
import { installPublicPackages } from "./publicPackages.fixtures";

const ROOT = resolve(import.meta.dirname, "../../../../../..");
const ORIGINAL =
  "export {};\nconst _originalE2ECount = 1;\nconsume(_originalE2ECount);\n";
const directories: string[] = [];
afterEach(() => {
  directories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

function _repository(parent = tmpdir()) {
  const directory = realpathSync(
    mkdtempSync(join(parent, "runtime-plugin-context-")),
  );
  directories.push(directory);
  symlinkSync(join(ROOT, "node_modules"), join(directory, "node_modules"));
  mkdirSync(join(directory, ".git"));
  mkdirSync(join(directory, "src"));
  writeFileSync(join(directory, ".gitignore"), "node_modules/\n");
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({ type: "module", scripts: { lint: "oxlint ." } }),
  );
  writeFileSync(join(directory, "src/reviewed.ts"), ORIGINAL);
  const config = {
    categories: { correctness: "off" },
    jsPlugins: [
      { name: "avandar", specifier: "@avandar/lint-typescript/oxlint" },
    ],
    rules: { curly: "error", "avandar/local-e2e-casing": "error" },
  };
  writeFileSync(join(directory, ".oxlintrc.json"), JSON.stringify(config));
  return { directory, config };
}

async function _coverage(directory: string, expectedSource = ORIGINAL) {
  const output: string[] = [];
  const status = await runCli(
    ["coverage", "src/reviewed.ts", "--format", "json", "--no-prompt"],
    {
      cwd: directory,
      stdout: (value) => {
        output.push(value);
      },
      stderr: () => {},
    },
  );
  expect(readFileSync(join(directory, "src/reviewed.ts"), "utf8")).toBe(
    expectedSource,
  );
  return { status, ...JSON.parse(output.join("")) };
}

it.each(
  ["cwd", "filename"].flatMap((guard) => {
    return ["root", "nested", "override", "inherited"].map((location) => {
      return [guard, location];
    });
  }),
)(
  "keeps a %s-sensitive Avandar wrapper in fallback under %s config",
  async (guard, location) => {
    const { directory, config } = _repository();
    const originalPath = join(directory, "src/reviewed.ts");
    const ruleUrl = pathToFileURL(
      join(
        ROOT,
        "packages/lint/typescript/src/oxlint/rules/local-e2e-casing.js",
      ),
    ).href;
    const compatUrl = pathToFileURL(
      join(
        ROOT,
        "packages/lint/typescript/node_modules/@oxlint/plugins/index.cjs",
      ),
    ).href;
    const runtimeGuard =
      guard === "cwd"
        ? `if (process.cwd() === ${JSON.stringify(directory)}) return {}; return rule.createOnce(context);`
        : `return { ...rule.createOnce(context), before() { return context.filename === ${JSON.stringify(originalPath)} ? false : undefined; } };`;
    writeFileSync(
      join(directory, "plugin.js"),
      `import { eslintCompatPlugin } from ${JSON.stringify(compatUrl)};
import rule from ${JSON.stringify(ruleUrl)};
export default eslintCompatPlugin({ meta: { name: "runtime-guard" }, rules: {
  "local-e2e-casing": { ...rule, createOnce(context) { ${runtimeGuard} } },
} });\n`,
    );
    const guarded = {
      ...config,
      jsPlugins: [
        {
          name: "avandar",
          specifier: location === "nested" ? "../plugin.js" : "./plugin.js",
        },
      ],
    };
    if (location === "nested") {
      writeFileSync(
        join(directory, ".oxlintrc.json"),
        JSON.stringify({ ...config, jsPlugins: [], rules: { curly: "error" } }),
      );
      writeFileSync(
        join(directory, "src/.oxlintrc.json"),
        JSON.stringify(guarded),
      );
    } else if (location === "override") {
      writeFileSync(
        join(directory, ".oxlintrc.json"),
        JSON.stringify({
          ...config,
          jsPlugins: [],
          overrides: [
            {
              files: ["src/*.ts"],
              jsPlugins: guarded.jsPlugins,
              rules: config.rules,
            },
          ],
        }),
      );
    } else if (location === "inherited") {
      writeFileSync(join(directory, "base.json"), JSON.stringify(guarded));
      writeFileSync(
        join(directory, ".oxlintrc.json"),
        JSON.stringify({ ...config, jsPlugins: [], extends: ["./base.json"] }),
      );
    } else {
      writeFileSync(join(directory, ".oxlintrc.json"), JSON.stringify(guarded));
    }
    const original = spawnSync(
      join(ROOT, "node_modules/.bin/oxlint"),
      ["--format", "json", "src/reviewed.ts"],
      { cwd: directory, encoding: "utf8" },
    );
    expect(original.status, original.stdout + original.stderr).toBe(0);
    expect(JSON.parse(original.stdout).diagnostics).toEqual([]);
    const result = await _coverage(directory);
    expect(result.status).toBe(0);
    expect(result.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId: "AF-13",
        capability: "local-primitive-bindings",
        state: "fallback",
        recovery: expect.stringContaining("plugin runtime context"),
      }),
    );
    expect(result.outcomes).toContainEqual(
      expect.objectContaining({ ruleId: "AF-01", state: "enforced" }),
    );
  },
);

it.each(["root", "nested", "override", "relative-entry"])(
  "proves the actual official Avandar implementation under %s registration",
  async (location) => {
    const { directory, config } = _repository();
    if (location === "nested") {
      writeFileSync(
        join(directory, "src/.oxlintrc.json"),
        JSON.stringify(config),
      );
    } else if (location === "override") {
      writeFileSync(
        join(directory, ".oxlintrc.json"),
        JSON.stringify({
          ...config,
          jsPlugins: [],
          overrides: [
            {
              files: ["src/*.ts"],
              jsPlugins: config.jsPlugins,
              rules: config.rules,
            },
          ],
        }),
      );
    } else if (location === "relative-entry") {
      const entry = join(ROOT, "packages/lint/typescript/src/oxlint/index.js");
      symlinkSync(entry, join(directory, "official-plugin.js"));
      config.jsPlugins[0]!.specifier = "./official-plugin.js";
      writeFileSync(join(directory, ".oxlintrc.json"), JSON.stringify(config));
    }
    const result = await _coverage(directory);
    expect(result.status).toBe(0);
    expect(result.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId: "AF-13",
        capability: "local-primitive-bindings",
        state: "enforced",
      }),
    );
  },
);

it("does not equate a conditional package wrapper with its official require target", async () => {
  const { directory } = _repository();
  rmSync(join(directory, "node_modules"));
  mkdirSync(join(directory, "node_modules/@avandar"), { recursive: true });
  readdirSync(join(ROOT, "node_modules"))
    .filter((name) => {
      return name !== "@avandar";
    })
    .forEach((name) => {
      symlinkSync(
        join(ROOT, "node_modules", name),
        join(directory, "node_modules", name),
      );
    });
  readdirSync(join(ROOT, "node_modules/@avandar"))
    .filter((name) => {
      return name !== "lint-typescript";
    })
    .forEach((name) => {
      symlinkSync(
        join(ROOT, "node_modules/@avandar", name),
        join(directory, "node_modules/@avandar", name),
      );
    });
  const pluginDirectory = join(
    directory,
    "node_modules/@avandar/lint-typescript",
  );
  mkdirSync(pluginDirectory);
  const originalPath = join(directory, "src/reviewed.ts");
  const ruleUrl = pathToFileURL(
    join(ROOT, "packages/lint/typescript/src/oxlint/rules/local-e2e-casing.js"),
  ).href;
  const compatUrl = pathToFileURL(
    join(
      ROOT,
      "packages/lint/typescript/node_modules/@oxlint/plugins/index.cjs",
    ),
  ).href;
  symlinkSync(
    join(ROOT, "packages/lint/typescript/src/oxlint/index.js"),
    join(pluginDirectory, "source.js"),
  );
  writeFileSync(
    join(pluginDirectory, "wrapper.js"),
    `import { eslintCompatPlugin } from ${JSON.stringify(compatUrl)};
import rule from ${JSON.stringify(ruleUrl)};
export default eslintCompatPlugin({ meta: { name: "conditional-wrapper" }, rules: {
  "local-e2e-casing": { ...rule, createOnce(context) {
    return { ...rule.createOnce(context), before() { return context.filename === ${JSON.stringify(originalPath)} ? false : undefined; } };
  } },
} });\n`,
  );
  writeFileSync(
    join(pluginDirectory, "package.json"),
    JSON.stringify({
      name: "@avandar/lint-typescript",
      version: "0.1.0",
      type: "module",
      exports: {
        "./oxlint": {
          import: "./wrapper.js",
          require: "./source.js",
          default: "./wrapper.js",
        },
      },
    }),
  );
  const original = spawnSync(
    join(ROOT, "node_modules/.bin/oxlint"),
    ["--format", "json", "src/reviewed.ts"],
    { cwd: directory, encoding: "utf8" },
  );
  expect(original.status, original.stdout + original.stderr).toBe(0);
  expect(JSON.parse(original.stdout).diagnostics).toEqual([]);
  const result = await _coverage(directory);
  expect(result.status).toBe(0);
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-13",
      capability: "local-primitive-bindings",
      state: "fallback",
    }),
  );
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({ ruleId: "AF-01", state: "enforced" }),
  );
});

it("proves the official packed entry from a standalone core package", async () => {
  const { directory } = _repository();
  rmSync(join(directory, "node_modules"));
  mkdirSync(join(directory, "node_modules/@avandar"), { recursive: true });
  readdirSync(join(ROOT, "node_modules"))
    .filter((name) => {
      return name !== "@avandar";
    })
    .forEach((name) => {
      symlinkSync(
        join(ROOT, "node_modules", name),
        join(directory, "node_modules", name),
      );
    });
  readdirSync(join(ROOT, "node_modules/@avandar"))
    .filter((name) => {
      return !["lint", "lint-typescript"].includes(name);
    })
    .forEach((name) => {
      symlinkSync(
        join(ROOT, "node_modules/@avandar", name),
        join(directory, "node_modules/@avandar", name),
      );
    });
  ["ajv", "yaml"].forEach((name) => {
    if (!existsSync(join(directory, "node_modules", name))) {
      symlinkSync(
        join(ROOT, "packages/lint/core/node_modules", name),
        join(directory, "node_modules", name),
      );
    }
  });
  if (!existsSync(join(directory, "node_modules/@oxlint"))) {
    symlinkSync(
      join(ROOT, "packages/lint/typescript/node_modules/@oxlint"),
      join(directory, "node_modules/@oxlint"),
    );
  }
  installPublicPackages(directory, ["core", "typescript"]);
  const result = spawnSync(
    process.execPath,
    [
      join(directory, "node_modules/@avandar/lint/dist/main.js"),
      "coverage",
      "src/reviewed.ts",
      "--format",
      "json",
      "--no-prompt",
    ],
    { cwd: directory, encoding: "utf8" },
  );
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(JSON.parse(result.stdout).outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-13",
      capability: "local-primitive-bindings",
      state: "enforced",
    }),
  );
  expect(readFileSync(join(directory, "src/reviewed.ts"), "utf8")).toBe(
    ORIGINAL,
  );
});

it("keeps the official utility-directory filename exclusion in the original context", async () => {
  const parent = realpathSync(
    mkdtempSync(join(tmpdir(), "runtime-utility-prefix-")),
  );
  directories.push(parent);
  const utilityDirectory = join(parent, "packages/shared/utils");
  mkdirSync(utilityDirectory, { recursive: true });
  const { directory, config } = _repository(utilityDirectory);
  const source =
    'import { identity, prop, propEq, isDefined } from "@avandar/utils";\nexport const result = [{ id: 1 }].map(function(row) { return row.id; });\n';
  writeFileSync(join(directory, "src/reviewed.ts"), source);
  writeFileSync(
    join(directory, ".oxlintrc.json"),
    JSON.stringify({
      ...config,
      rules: {
        ...config.rules,
        "avandar/property-helper-callbacks": "error",
        "avandar/optional-array-candidates": "error",
      },
    }),
  );
  const original = spawnSync(
    join(ROOT, "node_modules/.bin/oxlint"),
    ["--format", "json", "src/reviewed.ts"],
    { cwd: directory, encoding: "utf8" },
  );
  expect(original.status, original.stdout + original.stderr).toBe(0);
  expect(JSON.parse(original.stdout).diagnostics).toEqual([]);
  const result = await _coverage(directory, source);
  expect(result.status).toBe(0);
  ["AF-15", "AF-17"].forEach((ruleId) => {
    expect(
      result.outcomes.filter((entry: { ruleId: string; state: string }) => {
        return entry.ruleId === ruleId && entry.state === "enforced";
      }),
    ).toEqual([]);
  });
});
