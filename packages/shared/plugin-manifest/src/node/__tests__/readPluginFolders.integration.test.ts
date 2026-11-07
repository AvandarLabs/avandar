import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PluginManifestError } from "@plugin-manifest/compileManifest/PluginManifestError/PluginManifestError.ts";
import { readBundledPlugins } from "@plugin-manifest/node/readBundledPlugins.ts";
import { readPluginDirectory } from "@plugin-manifest/node/readPluginDirectory.ts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const MANIFEST_YAML = `
id: avandar.hello
name: "%plugin.name%"
description: "%plugin.description%"
version: "0.1.0"
license: MIT
engines:
  avandar: "^1"
entry: src/index.tsx
icon: puzzle
contributes:
  commands:
    - id: hello
      title: "%hello.title%"
      icon: hand-stop
`;

let repoRoot: string;

function _writeFile(path: string, contents: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, contents);
}

const DEFAULT_LOCALE_MESSAGES = {
  "plugin.name": "Hello",
  "plugin.description": "Says hello.",
  "hello.title": "Say hello",
};

function _writePlugin(
  folderName: string,
  overrides: {
    yaml?: string;
    dependencies?: Record<string, string>;
    /** Raw file contents by locale file name, merged over a valid en.json. */
    localeFiles?: Record<string, string>;
    /** Raw package.json contents, used instead of building one. */
    packageJson?: string;
  } = {},
): string {
  const directory = join(repoRoot, "plugins", folderName);
  _writeFile(join(directory, "ava.yaml"), overrides.yaml ?? MANIFEST_YAML);
  const localeFiles = {
    "en.json": JSON.stringify(DEFAULT_LOCALE_MESSAGES),
    ...overrides.localeFiles,
  };
  Object.entries(localeFiles).forEach(([fileName, contents]) => {
    _writeFile(join(directory, "locales", fileName), contents);
  });
  _writeFile(join(directory, "src/index.tsx"), "export default {};\n");
  _writeFile(
    join(directory, "package.json"),
    overrides.packageJson ??
      JSON.stringify({ dependencies: overrides.dependencies ?? {} }),
  );
  return directory;
}

function _getError(run: () => unknown): PluginManifestError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(PluginManifestError);
    return error as PluginManifestError;
  }
  return expect.unreachable();
}

beforeEach(() => {
  repoRoot = mkdtempSync(join(tmpdir(), "ava-plugins-"));
  const iconsDirectory = join(
    repoRoot,
    "node_modules/@tabler/icons-react/dist/esm/icons",
  );
  mkdirSync(iconsDirectory, { recursive: true });
  writeFileSync(join(iconsDirectory, "IconPuzzle.mjs"), "");
  writeFileSync(join(iconsDirectory, "IconHandStop.mjs"), "");
});

afterEach(() => {
  rmSync(repoRoot, { recursive: true, force: true });
});

describe("readPluginDirectory", () => {
  it("returns the folder name, manifest id, absolute entry path, and locale messages of a valid plugin", () => {
    const directory = _writePlugin("hello");
    const plugin = readPluginDirectory({ directory, repoRoot });
    expect(plugin.folderName).toBe("hello");
    expect(plugin.compiled.manifest.id).toBe("avandar.hello");
    expect(plugin.entryPath).toBe(join(directory, "src/index.tsx"));
    expect(plugin.locales.en?.["hello.title"]).toBe("Say hello");
  });

  it("reports an unknown icon, a missing entry, and an unapproved dependency together", () => {
    const directory = _writePlugin("hello", {
      yaml: MANIFEST_YAML.replace("icon: puzzle", "icon: no-such-icon").replace(
        "entry: src/index.tsx",
        "entry: src/missing.tsx",
      ),
      dependencies: { lodash: "^4.17.21" },
    });
    const issues = _getError(() => {
      return readPluginDirectory({ directory, repoRoot });
    }).issues.join("\n");
    expect(issues).toContain('unknown Tabler icon "no-such-icon"');
    expect(issues).toContain("entry: src/missing.tsx does not exist");
    expect(issues).toContain('dependency "lodash" is not approved');
  });

  it("reports ava.yaml not found for a plugin folder without one", () => {
    const directory = join(repoRoot, "plugins/hello");
    mkdirSync(directory, { recursive: true });
    const error = _getError(() => {
      return readPluginDirectory({ directory, repoRoot });
    });
    expect(error.sourcePath).toBe("plugins/hello/ava.yaml");
    expect(error.issues).toEqual(["ava.yaml not found"]);
  });

  it("prefixes the parse error of a locale file that is not valid JSON with its path", () => {
    const directory = _writePlugin("hello", {
      localeFiles: { "en.json": '{ "plugin.name": ' },
    });
    const error = _getError(() => {
      return readPluginDirectory({ directory, repoRoot });
    });
    expect(error.sourcePath).toBe("plugins/hello/ava.yaml");
    expect(error.issues).toHaveLength(1);
    expect(error.issues[0]).toMatch(/^locales\/en\.json: \S/);
  });

  it("names the key of a locale value that is not a string, even one no manifest field references", () => {
    const directory = _writePlugin("hello", {
      localeFiles: {
        "es.json": JSON.stringify({ "plugin.name": "Hola", unused: 5 }),
      },
    });
    expect(
      _getError(() => {
        return readPluginDirectory({ directory, repoRoot });
      }).issues,
    ).toEqual(['locales/es.json: "unused" must be a string']);
  });

  it("rejects a locale file whose top level is not an object", () => {
    const directory = _writePlugin("hello", {
      localeFiles: { "en.json": JSON.stringify(["Hello"]) },
    });
    expect(
      _getError(() => {
        return readPluginDirectory({ directory, repoRoot });
      }).issues,
    ).toEqual([
      "locales/en.json: must be a JSON object of message keys to strings",
    ]);
  });

  it("prefixes the parse error of a package.json that is not valid JSON with its path", () => {
    const directory = _writePlugin("hello", { packageJson: "{ nope" });
    const issues = _getError(() => {
      return readPluginDirectory({ directory, repoRoot });
    }).issues;
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/^package\.json: \S/);
  });

  it("rejects a package.json whose top level is null", () => {
    const directory = _writePlugin("hello", { packageJson: "null" });
    expect(
      _getError(() => {
        return readPluginDirectory({ directory, repoRoot });
      }).issues,
    ).toEqual(["package.json: must be a JSON object"]);
  });

  it("reports package.json dependencies given as an array as one problem with dependencies", () => {
    const directory = _writePlugin("hello", {
      packageJson: JSON.stringify({ dependencies: ["lodash"] }),
    });
    expect(
      _getError(() => {
        return readPluginDirectory({ directory, repoRoot });
      }).issues,
    ).toEqual([
      'package.json: "dependencies" must be an object of package names to version strings',
    ]);
  });

  it("reports the dependency whose version is not a string", () => {
    const directory = _writePlugin("hello", {
      packageJson: JSON.stringify({ dependencies: { lodash: 4 } }),
    });
    expect(
      _getError(() => {
        return readPluginDirectory({ directory, repoRoot });
      }).issues,
    ).toEqual(['package.json: "dependencies.lodash" must be a string']);
  });

  it("reports a malformed locale file and a malformed package.json together", () => {
    const directory = _writePlugin("hello", {
      localeFiles: { "en.json": "{ nope" },
      packageJson: "[]",
    });
    const issues = _getError(() => {
      return readPluginDirectory({ directory, repoRoot });
    }).issues;
    expect(issues).toHaveLength(2);
    expect(issues[0]).toMatch(/^locales\/en\.json: /);
    expect(issues[1]).toBe("package.json: must be a JSON object");
  });
});

describe("readBundledPlugins", () => {
  it("returns no plugins when plugins/bundled.yaml is missing", () => {
    expect(readBundledPlugins(repoRoot)).toEqual([]);
  });

  it("returns the manifest of every folder listed in plugins/bundled.yaml", () => {
    _writePlugin("hello");
    _writeFile(join(repoRoot, "plugins/bundled.yaml"), "plugins:\n  - hello\n");
    expect(
      readBundledPlugins(repoRoot).map((plugin) => {
        return plugin.compiled.manifest.id;
      }),
    ).toEqual(["avandar.hello"]);
  });

  it("rejects two bundled folders with the same plugin id", () => {
    _writePlugin("hello");
    _writePlugin("hello-copy");
    _writeFile(
      join(repoRoot, "plugins/bundled.yaml"),
      "plugins:\n  - hello\n  - hello-copy\n",
    );
    expect(() => {
      return readBundledPlugins(repoRoot);
    }).toThrow(/avandar.hello is bundled twice/);
  });

  it("rejects a folder name that could escape plugins/", () => {
    _writeFile(
      join(repoRoot, "plugins/bundled.yaml"),
      "plugins:\n  - ../evil\n",
    );
    const error = _getError(() => {
      return readBundledPlugins(repoRoot);
    });
    expect(error.sourcePath).toBe("plugins/bundled.yaml");
    expect(error.message).toContain("plugins/bundled.yaml");
    expect(error.issues).toEqual([
      'plugins.0: "../evil" must be a lowercase kebab-case folder name',
    ]);
  });

  it.each([
    ["an empty file", ""],
    ["only comments", "# no plugins yet\n"],
    ["a plugins key with every entry commented out", "plugins:\n  # - hello\n"],
    ["an empty plugins list", "plugins: []\n"],
  ])("returns no plugins for %s", (_label, yamlText) => {
    _writeFile(join(repoRoot, "plugins/bundled.yaml"), yamlText);
    expect(readBundledPlugins(repoRoot)).toEqual([]);
  });

  it("rejects a duplicate key in plugins/bundled.yaml", () => {
    _writeFile(
      join(repoRoot, "plugins/bundled.yaml"),
      "plugins: []\nplugins: []\n",
    );
    const error = _getError(() => {
      return readBundledPlugins(repoRoot);
    });
    expect(error.sourcePath).toBe("plugins/bundled.yaml");
    expect(error.issues.join("\n")).toMatch(/unique/i);
  });

  it("rejects a key other than plugins in plugins/bundled.yaml", () => {
    _writeFile(join(repoRoot, "plugins/bundled.yaml"), "pluginz:\n  - hello\n");
    const error = _getError(() => {
      return readBundledPlugins(repoRoot);
    });
    expect(error.sourcePath).toBe("plugins/bundled.yaml");
    expect(error.issues.join("\n")).toContain("pluginz");
  });

  it("rejects a plugins value that is not a list", () => {
    _writeFile(join(repoRoot, "plugins/bundled.yaml"), "plugins: hello\n");
    expect(
      _getError(() => {
        return readBundledPlugins(repoRoot);
      }).issues.join("\n"),
    ).toMatch(/^plugins: /);
  });
});
