import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PluginManifestError } from "@plugin-manifest/compileManifest/PluginManifestError.ts";
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

function _writePlugin(
  folderName: string,
  overrides: {
    yaml?: string;
    dependencies?: Record<string, string>;
  } = {},
): string {
  const directory = join(repoRoot, "plugins", folderName);
  _writeFile(join(directory, "ava.yaml"), overrides.yaml ?? MANIFEST_YAML);
  _writeFile(
    join(directory, "locales/en.json"),
    JSON.stringify({
      "plugin.name": "Hello",
      "plugin.description": "Says hello.",
      "hello.title": "Say hello",
    }),
  );
  _writeFile(join(directory, "src/index.tsx"), "export default {};\n");
  _writeFile(
    join(directory, "package.json"),
    JSON.stringify({ dependencies: overrides.dependencies ?? {} }),
  );
  return directory;
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
  it("reads and validates a plugin folder", () => {
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
    try {
      readPluginDirectory({ directory, repoRoot });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PluginManifestError);
      const issues = (error as PluginManifestError).issues.join("\n");
      expect(issues).toContain('unknown Tabler icon "no-such-icon"');
      expect(issues).toContain("entry: src/missing.tsx does not exist");
      expect(issues).toContain('dependency "lodash" is not approved');
    }
  });
});

describe("readBundledPlugins", () => {
  it("returns no plugins when plugins/bundled.yaml is missing", () => {
    expect(readBundledPlugins(repoRoot)).toEqual([]);
  });

  it("reads every folder listed in plugins/bundled.yaml", () => {
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
});
