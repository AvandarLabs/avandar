import {
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
import { loadRuleCatalog } from "../../../src/catalog/loadRuleCatalog";
import { collectCoverage } from "../../../src/cli/coverage";
import { runCli } from "../../../src/cli/main";
import { createNativeCoverageProbes } from "../../../src/cli/nativeSafeRules";

const ROOT = resolve(import.meta.dirname, "../../../../../..");
const directories: string[] = [];
const ORIGINAL =
  'import { identity, prop, propEq, isDefined } from "@avandar/utils";\nexport {};\nconst unicode = "😀 é";\nconsume(unicode);\n';
afterEach(() => {
  directories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

function _repository(transform = "") {
  const directory = mkdtempSync(join(tmpdir(), "exact-native-coverage-"));
  directories.push(directory);
  mkdirSync(join(directory, "node_modules/.bin"), { recursive: true });
  readdirSync(join(ROOT, "node_modules"))
    .filter((entry) => {
      return entry !== ".bin";
    })
    .forEach((entry) => {
      symlinkSync(
        join(ROOT, "node_modules", entry),
        join(directory, "node_modules", entry),
      );
    });
  symlinkSync(join(ROOT, "eslint"), join(directory, "eslint"));
  mkdirSync(join(directory, ".git"));
  mkdirSync(join(directory, "src"));
  writeFileSync(join(directory, ".gitignore"), "node_modules/\n");
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({ type: "module", scripts: { lint: "oxlint ." } }),
  );
  writeFileSync(
    join(directory, ".oxlintrc.json"),
    readFileSync(join(ROOT, ".oxlintrc.json")),
  );
  writeFileSync(
    join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        module: "preserve",
      },
      include: ["src"],
    }),
  );
  writeFileSync(join(directory, "src/reviewed.tsx"), ORIGINAL);
  const wrapper = `#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const { appendFileSync, readFileSync } = require("node:fs");
appendFileSync(${JSON.stringify(join(directory, "children.jsonl"))}, JSON.stringify({ event: "start", args: process.argv.slice(2), cwd: process.cwd() }) + "\\n");
const result = spawnSync(${JSON.stringify(join(ROOT, "node_modules/.bin/oxlint"))}, process.argv.slice(2), { encoding: "utf8" });
let stdout = result.stdout;
let status = result.status;
if (process.argv.includes("json")) {
  const output = JSON.parse(stdout);
  ${transform.replace("ORIGINAL_PATH", JSON.stringify(join(directory, "src/reviewed.tsx")))}
  stdout = JSON.stringify(output);
}
appendFileSync(${JSON.stringify(join(directory, "children.jsonl"))}, JSON.stringify({ event: "end", args: process.argv.slice(2), cwd: process.cwd() }) + "\\n");
process.stdout.write(stdout);
process.stderr.write(result.stderr);
process.exit(status ?? 1);
`;
  writeFileSync(join(directory, "node_modules/.bin/oxlint"), wrapper, {
    mode: 0o755,
  });
  return directory;
}

async function _coverage(directory: string, paths = ["src/reviewed.tsx"]) {
  const mirrorsBefore = readdirSync(tmpdir())
    .filter((name) => {
      return name.startsWith("avandar-native-proof-");
    })
    .sort();
  const stdout: string[] = [];
  const status = await runCli(
    ["coverage", ...paths, "--format", "json", "--no-prompt"],
    {
      cwd: directory,
      stdout: (value) => {
        stdout.push(value);
      },
      stderr: () => {},
    },
  );
  const result = JSON.parse(stdout.join(""));
  const children = readFileSync(join(directory, "children.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((line) => {
      return JSON.parse(line);
    });
  children
    .filter((entry) => {
      return entry.args.includes("json");
    })
    .forEach((entry) => {
      expect(() => {
        return readdirSync(entry.cwd);
      }).toThrow();
    });
  expect(readFileSync(join(directory, "src/reviewed.tsx"), "utf8")).toBe(
    ORIGINAL,
  );
  expect(
    readdirSync(tmpdir())
      .filter((name) => {
        return name.startsWith("avandar-native-proof-");
      })
      .sort(),
  ).toEqual(mirrorsBefore);
  return { ...result, status, children };
}

it("accepts canonical pinned-engine diagnostics inside exact Unicode byte ranges", async () => {
  const result = await _coverage(_repository());
  expect(result.status).toBe(0);
  expect(
    result.outcomes
      .filter((entry: { state: string }) => {
        return entry.state === "enforced";
      })
      .map((entry: { ruleId: string; capability: string }) => {
        return `${entry.ruleId}:${entry.capability}`;
      }),
  ).toEqual([
    "AF-01:if-body",
    "AF-03:type-imports",
    "AF-03:type-exports",
    "AF-04:literal-assertions",
    "AF-06:standalone-body-prose",
    "AF-07:short-prose-jsdoc",
    "AF-08:direct-top-level-calls",
    "AF-09:direct-nested-calls",
    "AF-10:private-direct-calls",
    "AF-11:one-to-one-module-key",
    "AF-12:single-component-props",
    "AF-13:local-primitive-bindings",
    "AF-14:boolean-jsx-children",
    "AF-15:literal-property-map",
    "AF-15:literal-property-equality",
    "AF-16:fresh-data-object",
    "AF-17:optional-parameter-candidates",
  ]);
});

it.each([
  [
    "sibling path",
    'output.diagnostics.forEach(diagnostic => { diagnostic.filename = "src/sibling.tsx"; });',
  ],
  [
    "original workspace path",
    "output.diagnostics.forEach(diagnostic => { diagnostic.filename = " +
      "ORIGINAL_PATH" +
      "; });",
  ],
  [
    "missing path",
    "output.diagnostics.forEach(diagnostic => { delete diagnostic.filename; });",
  ],
  [
    "wrong canonical namespace",
    'output.diagnostics.forEach(diagnostic => { diagnostic.code = diagnostic.code.replace(/^[^(]+/, "lookalike"); });',
  ],
  [
    "original source labels",
    "output.diagnostics.forEach(diagnostic => { diagnostic.labels.forEach(label => { label.span.offset = 0; }); });",
  ],
  [
    "past final seed",
    "output.diagnostics.forEach(diagnostic => { diagnostic.labels.forEach(label => { label.span.offset = 1000000; }); });",
  ],
  [
    "range crossing label",
    "output.diagnostics.forEach(diagnostic => { diagnostic.labels.forEach(label => { label.span.length = 1000000; }); });",
  ],
  [
    "zero length label",
    "output.diagnostics.forEach(diagnostic => { diagnostic.labels.forEach(label => { label.span.length = 0; }); });",
  ],
  [
    "warning-only evidence",
    'output.diagnostics.forEach(diagnostic => { diagnostic.severity = "warning"; }); status = 0;',
  ],
  ["unexpected exit", "status = 2;"],
  ["unknown truncation envelope", "output.truncated = true;"],
  ["missing diagnostics schema", "delete output.diagnostics;"],
  ["malformed diagnostic", "output.diagnostics.push(null);"],
  [
    "runtime error beside rules",
    'output.diagnostics.push({ code: "oxlint", message: "Plugin runtime error", severity: "error", filename: "src/reviewed.tsx", labels: [] });',
  ],
])(
  "rejects %s from an otherwise real engine proof",
  async (_reason, transform) => {
    const directory = _repository(transform);
    const result = await _coverage(directory);
    expect(
      result.outcomes.filter((entry: { state: string }) => {
        return entry.state === "enforced";
      }),
    ).toEqual([]);
  },
);

it("does not credit the equality seed diagnostic to the map capability", async () => {
  const result = await _coverage(
    _repository(`
    const utility = output.diagnostics.filter(diagnostic => diagnostic.code === "avandar(property-helper-callbacks)");
    const equality = utility.sort((first, second) => second.labels[0].span.offset - first.labels[0].span.offset)[0];
    if (!equality) throw new Error("Missing actual utility diagnostics");
    output.diagnostics = output.diagnostics.filter(diagnostic => diagnostic.code !== "avandar(property-helper-callbacks)" || diagnostic === equality);
  `),
  );
  expect(result.status).toBe(0);
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-15",
      capability: "literal-property-map",
      state: "fallback",
    }),
  );
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-15",
      capability: "literal-property-equality",
      state: "enforced",
    }),
  );
});

it.each(["root-object", "root-string", "inherited", "override", "nested"])(
  "executes reviewed plugins only from original source paths with %s config",
  async (shape) => {
    const directory = _repository();
    mkdirSync(join(directory, "plugins"));
    const log = join(directory, "plugin-imports.jsonl");
    const trace = `import { appendFileSync } from "node:fs";\nappendFileSync(${JSON.stringify(log)}, JSON.stringify(import.meta.url) + "\\n");\n`;
    const helper = trace + "export function check() { return true; }\n";
    const plugin =
      trace +
      'import { check } from "./helper.js";\nexport default { meta: { name: "guard" }, rules: { untouched: { meta: { schema: [] }, create() { check(); return {}; } } } };\n';
    writeFileSync(join(directory, "plugins/helper.js"), helper);
    writeFileSync(join(directory, "plugins/reviewed.js"), plugin);
    const configPath = join(directory, ".oxlintrc.json");
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    const declaration = { name: "guard", specifier: "./plugins/reviewed.js" };
    if (shape === "inherited") {
      mkdirSync(join(directory, "config"));
      writeFileSync(
        join(directory, "config/base.json"),
        JSON.stringify({
          jsPlugins: [{ ...declaration, specifier: "../plugins/reviewed.js" }],
          rules: { "guard/untouched": "error" },
        }),
      );
      config.extends = ["./config/base.json"];
    } else if (shape === "override") {
      config.overrides.push({
        files: ["plugins/*.js"],
        jsPlugins: [declaration],
        rules: { "guard/untouched": "error" },
      });
    } else if (shape === "nested") {
      writeFileSync(
        join(directory, "plugins/.oxlintrc.json"),
        JSON.stringify({
          extends: ["../.oxlintrc.json"],
          jsPlugins: [{ ...declaration, specifier: "./reviewed.js" }],
          rules: { "guard/untouched": "error", curly: "error" },
        }),
      );
    } else {
      config.jsPlugins.push(
        shape === "root-string" ? "./plugins/reviewed.js" : declaration,
      );
      config.rules["guard/untouched"] = "error";
    }
    writeFileSync(configPath, JSON.stringify(config));
    const result = await _coverage(directory, [
      "plugins/reviewed.js",
      "plugins/helper.js",
    ]);
    expect(result.status).toBe(0);
    expect(
      result.outcomes.filter((entry: { ruleId: string; state: string }) => {
        return entry.ruleId === "AF-01" && entry.state === "enforced";
      }),
    ).toHaveLength(2);
    const imports: string[] = readFileSync(log, "utf8")
      .trim()
      .split("\n")
      .map((line) => {
        return JSON.parse(line);
      });
    expect(imports.length).toBeGreaterThan(0);
    expect(
      imports.every((path) => {
        return (
          path ===
            pathToFileURL(realpathSync(join(directory, "plugins/helper.js")))
              .href ||
          path ===
            pathToFileURL(realpathSync(join(directory, "plugins/reviewed.js")))
              .href
        );
      }),
    ).toBe(true);
    expect(readFileSync(join(directory, "plugins/helper.js"), "utf8")).toBe(
      helper,
    );
    expect(readFileSync(join(directory, "plugins/reviewed.js"), "utf8")).toBe(
      plugin,
    );
  },
);

it("reuses one inclusion listing for isolated mixed-language proofs and late requests", async () => {
  const directory = _repository();
  const paths = [
    "src/a.ts",
    "src/b.tsx",
    "src/c.js",
    "src/d.jsx",
    "src/e.ts",
    "src/f.js",
  ];
  [...paths, "src/late.ts"].forEach((path) => {
    writeFileSync(join(directory, path), ORIGINAL);
  });
  const probes = createNativeCoverageProbes();
  const collect = (selected: string[]) => {
    return collectCoverage({
      catalog: loadRuleCatalog(),
      cwd: directory,
      paths: selected,
      probes,
    });
  };
  const start = performance.now();
  const first = await collect(paths);
  const late = await collect(["src/late.ts", "src/a.ts"]);
  expect(first.operational).toBe(true);
  expect(late.operational).toBe(true);
  expect(
    first.outcomes.filter((entry) => {
      return entry.ruleId === "AF-01" && entry.state === "enforced";
    }),
  ).toHaveLength(6);
  expect(
    late.outcomes.filter((entry) => {
      return entry.ruleId === "AF-01" && entry.state === "enforced";
    }),
  ).toHaveLength(2);
  const events = readFileSync(join(directory, "children.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((line) => {
      return JSON.parse(line);
    });
  const starts = events.filter((event) => {
    return event.event === "start";
  });
  console.info(
    JSON.stringify({
      measurement: "mixed-isolated-proof",
      milliseconds: Math.round(performance.now() - start),
      children: starts.length,
      listings: starts.filter((event) => {
        return event.args.includes("files");
      }).length,
    }),
  );
  expect(
    starts.filter((event) => {
      return event.args.includes("files");
    }),
  ).toHaveLength(1);
  expect(
    starts.filter((event) => {
      return event.args.includes("json");
    }),
  ).toHaveLength(7);
  let active = 0;
  events.forEach((event) => {
    active += event.event === "start" ? 1 : -1;
    expect(active).toBeGreaterThanOrEqual(0);
    expect(active).toBeLessThanOrEqual(1);
  });
  expect(active).toBe(0);
  paths.forEach((path) => {
    expect(readFileSync(join(directory, path), "utf8")).toBe(ORIGINAL);
  });
  starts
    .filter((event) => {
      return event.args.includes("json");
    })
    .forEach((event) => {
      expect(() => {
        return readdirSync(event.cwd);
      }).toThrow();
    });
}, 15000);

it("keeps oversized source bounded without starting a seed child", async () => {
  const directory = _repository();
  const source = "//" + "x".repeat(1024 * 1024) + "\nexport {};\n";
  writeFileSync(join(directory, "src/reviewed.tsx"), source);
  const stdout: string[] = [];
  expect(
    await runCli(
      ["coverage", "src/reviewed.tsx", "--format", "json", "--no-prompt"],
      {
        cwd: directory,
        stdout: (value) => {
          stdout.push(value);
        },
        stderr: () => {},
      },
    ),
  ).toBe(0);
  const result = JSON.parse(stdout.join(""));
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-01",
      state: "fallback",
      recovery: expect.stringContaining("source-byte bound"),
    }),
  );
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-08",
      capability: "direct-top-level-calls",
      state: "fallback",
      recovery: expect.stringContaining("source-byte bound"),
    }),
  );
  const events = readFileSync(join(directory, "children.jsonl"), "utf8");
  expect(events).not.toContain('"json"');
  expect(readFileSync(join(directory, "src/reviewed.tsx"), "utf8")).toBe(
    source,
  );
});

it("chooses seed identifiers absent from the original prefix", async () => {
  const directory = _repository();
  const source =
    "const _avandarE2ECount = 2;\nconsume(_avandarE2ECount);\nexport {};\n";
  writeFileSync(join(directory, "src/reviewed.tsx"), source);
  const result = await collectCoverage({
    catalog: loadRuleCatalog(),
    probes: createNativeCoverageProbes(),
    paths: ["src/reviewed.tsx"],
    cwd: directory,
  });
  expect(result.operational).toBe(true);
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-08",
      capability: "direct-top-level-calls",
      state: "enforced",
    }),
  );
  expect(readFileSync(join(directory, "src/reviewed.tsx"), "utf8")).toBe(
    source,
  );
});

it.each(["jsonc", "dynamic", "symlink"])(
  "falls back before seeded execution for unsupported %s context",
  async (shape) => {
    const directory = _repository();
    const configPath = join(directory, ".oxlintrc.json");
    if (shape === "jsonc") {
      writeFileSync(
        configPath,
        "// JSONC is accepted by the engine.\n" +
          readFileSync(configPath, "utf8"),
      );
    } else if (shape === "dynamic") {
      writeFileSync(
        join(directory, "oxlint.config.ts"),
        "export default {};\n",
      );
    } else {
      writeFileSync(join(directory, "src/original.tsx"), ORIGINAL);
      rmSync(join(directory, "src/reviewed.tsx"));
      symlinkSync(
        join(directory, "src/original.tsx"),
        join(directory, "src/reviewed.tsx"),
      );
    }
    const result = await _coverage(directory);
    expect(result.status).toBe(shape === "dynamic" ? 1 : 0);
    expect(result.outcomes).toContainEqual(
      expect.objectContaining({ ruleId: "AF-01", state: "fallback" }),
    );
    const events = readFileSync(join(directory, "children.jsonl"), "utf8");
    expect(events).not.toContain('"json"');
  },
);

it("keeps cached inclusion listings scoped to each source cwd", async () => {
  const first = _repository();
  const second = _repository();
  const configPath = join(first, ".oxlintrc.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  config.rules.curly = "off";
  config.overrides = [];
  writeFileSync(configPath, JSON.stringify(config));
  const probes = createNativeCoverageProbes();
  await Promise.all(
    [
      [first, "fallback"],
      [second, "enforced"],
    ].map(async ([directory, state]) => {
      const result = await collectCoverage({
        catalog: loadRuleCatalog(),
        probes,
        cwd: directory,
        paths: ["src/reviewed.tsx"],
      });
      expect(result.outcomes).toContainEqual(
        expect.objectContaining({ ruleId: "AF-01", state }),
      );
      const events = readFileSync(join(directory, "children.jsonl"), "utf8")
        .trim()
        .split("\n")
        .map((line) => {
          return JSON.parse(line);
        });
      expect(
        events.filter((event) => {
          return event.event === "start" && event.args.includes("files");
        }),
      ).toHaveLength(1);
    }),
  );
});

it("keeps same basenames independent under error warning and disabled overrides", async () => {
  const directory = _repository();
  const paths = ["error", "warning", "disabled"].map((name) => {
    mkdirSync(join(directory, "src", name));
    const path = `src/${name}/reviewed.ts`;
    writeFileSync(join(directory, path), ORIGINAL);
    return path;
  });
  const configPath = join(directory, ".oxlintrc.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  config.overrides.push(
    ...["warning", "disabled"].map((name) => {
      return {
        files: [`src/${name}/reviewed.ts`],
        rules: {
          curly: name === "warning" ? "warn" : "off",
          "avandar/local-e2e-casing": name === "warning" ? "warn" : "off",
        },
      };
    }),
  );
  writeFileSync(configPath, JSON.stringify(config));
  const result = await _coverage(directory, paths);
  expect(result.status).toBe(0);
  ["AF-01", "AF-08", "AF-09", "AF-10"].forEach((ruleId) => {
    expect(
      result.outcomes.filter((entry: { ruleId: string; state: string }) => {
        return entry.ruleId === ruleId && entry.state === "enforced";
      }),
    ).toEqual([expect.objectContaining({ path: join(directory, paths[0]!) })]);
  });
});

it.each([false, true])(
  "preserves source directives with reenabled=%s",
  async (reenabled) => {
    const directory = _repository();
    const source =
      "export {};\nif (Boolean(1)) consume();\n/* eslint-disable curly */\n" +
      (reenabled ? "/* eslint-enable curly */\n" : "");
    writeFileSync(join(directory, "src/reviewed.tsx"), source);
    const result = await collectCoverage({
      catalog: loadRuleCatalog(),
      probes: createNativeCoverageProbes(),
      paths: ["src/reviewed.tsx"],
      cwd: directory,
    });
    expect(result.operational).toBe(true);
    expect(result.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId: "AF-01",
        state: reenabled ? "enforced" : "fallback",
      }),
    );
    expect(readFileSync(join(directory, "src/reviewed.tsx"), "utf8")).toBe(
      source,
    );
  },
);

it("retains original import relationships for isolated type-aware seed proofs", async () => {
  const directory = _repository();
  const first =
    "export type Original = { value: number };\nexport const value = 1;\n";
  const second =
    'import { value } from "./first";\nexport const result = value;\n';
  writeFileSync(join(directory, "src/first.ts"), first);
  writeFileSync(join(directory, "src/second.ts"), second);
  writeFileSync(
    join(directory, "src/unreviewed.ts"),
    'import { value } from "./second";\nexport { value };\n',
  );
  const result = await _coverage(directory, ["src/first.ts", "src/second.ts"]);
  expect(result.status).toBe(0);
  expect(
    result.outcomes.filter((entry: { ruleId: string; state: string }) => {
      return entry.ruleId === "AF-03" && entry.state === "enforced";
    }),
  ).toHaveLength(4);
  expect(readFileSync(join(directory, "src/first.ts"), "utf8")).toBe(first);
  expect(readFileSync(join(directory, "src/second.ts"), "utf8")).toBe(second);
});

it("settles later requests after an operational proof failure", async () => {
  const directory = _repository(
    'if (process.argv.some(argument => argument.includes("fail.ts"))) { delete output.diagnostics; }',
  );
  writeFileSync(join(directory, "src/fail.ts"), ORIGINAL);
  const probes = createNativeCoverageProbes();
  const collect = (paths: string[]) => {
    return collectCoverage({
      catalog: loadRuleCatalog(),
      probes,
      paths,
      cwd: directory,
    });
  };
  const first = await collect(["src/fail.ts", "src/reviewed.tsx"]);
  expect(first.operational).toBe(false);
  expect(first.outcomes).toContainEqual(
    expect.objectContaining({
      path: join(directory, "src/reviewed.tsx"),
      ruleId: "AF-01",
      state: "enforced",
    }),
  );
  const late = await collect(["src/reviewed.tsx"]);
  expect(late.operational).toBe(true);
  expect(late.outcomes).toContainEqual(
    expect.objectContaining({ ruleId: "AF-01", state: "enforced" }),
  );
});

it.each([
  ["malformed JSON", 'process.stdout.write("{"); process.exit(1);'],
  ["output overflow", 'process.stdout.write("x".repeat(9 * 1024 * 1024));'],
  [
    "runtime stderr",
    'process.stderr.write("Error: plugin runtime failed\\n");',
  ],
  ["signal", 'process.kill(process.pid, "SIGTERM");'],
  [
    "timeout",
    "Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 35000);",
  ],
])(
  "fails closed and cleans mirrors after %s",
  async (_reason, transform) => {
    const result = await _coverage(_repository(transform));
    expect(result.status).toBe(1);
    expect(result.outcomes).toContainEqual(
      expect.objectContaining({
        ruleId: "AF-01",
        state: "fallback",
        operational: false,
      }),
    );
    expect(
      result.outcomes.filter((entry: { state: string }) => {
        return entry.state === "enforced";
      }),
    ).toEqual([]);
  },
  40000,
);

it("fails operationally when the actual configured plugin throws during rule creation", async () => {
  const directory = _repository();
  writeFileSync(
    join(directory, "failing-plugin.js"),
    'export default { meta: { name: "broken" }, rules: { fail: { meta: { schema: [] }, create() { throw new Error("Intentional coverage fixture failure"); } } } };\n',
  );
  const configPath = join(directory, ".oxlintrc.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  config.jsPlugins.push({ name: "broken", specifier: "./failing-plugin.js" });
  config.rules["broken/fail"] = "error";
  writeFileSync(configPath, JSON.stringify(config));
  const result = await _coverage(directory);
  expect(result.status).toBe(1);
  expect(result.outcomes).toContainEqual(
    expect.objectContaining({
      ruleId: "AF-01",
      state: "fallback",
      operational: false,
    }),
  );
  expect(
    result.outcomes.filter((entry: { state: string }) => {
      return entry.state === "enforced";
    }),
  ).toEqual([]);
});
