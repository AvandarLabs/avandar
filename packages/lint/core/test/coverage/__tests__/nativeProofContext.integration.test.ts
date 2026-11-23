import {
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, it } from "vitest";
import {
  ORIGINAL,
  createNativeRepository as _repository,
  collectNativeCoverage as _coverage,
} from "./nativeProof.fixtures";

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
