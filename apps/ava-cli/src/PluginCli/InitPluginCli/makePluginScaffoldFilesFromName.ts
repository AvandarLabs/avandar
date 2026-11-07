function _toTitleCase(name: string): string {
  return name
    .split("-")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function _toJsonFile(contents: Record<string, unknown>): string {
  return `${JSON.stringify(contents, null, 2)}\n`;
}

function _buildManifest(options: { name: string; publisher: string }): string {
  return [
    `id: ${options.publisher}.${options.name}`,
    'name: "%plugin.name%"',
    'description: "%plugin.description%"',
    'version: "0.1.0"',
    "license: MIT",
    "engines:",
    '  avandar: "^1"',
    "entry: src/index.tsx",
    "icon: puzzle",
    "permissions: []",
    "contributes:",
    "  commands:",
    "    - id: hello",
    '      title: "%hello.title%"',
    "      icon: hand-stop",
    "  menus:",
    "    dataExplorer.toolbar:",
    "      - command: hello",
    "",
  ].join("\n");
}

function _buildPackageJson(name: string): string {
  return _toJsonFile({
    name: `@avandar-plugins/${name}`,
    version: "0.1.0",
    private: true,
    license: "MIT",
    type: "module",
    dependencies: {
      "@avandar/plugin-sdk": "workspace:*",
      "@avandar/plugin-ui": "workspace:*",
    },
    peerDependencies: { react: "^19.0.0" },
  });
}

// The vitest setup file is included so test files the plugin adds under `src`
// see the jest-dom matcher types that setup file declares.
function _buildTsconfig(): string {
  return [
    "{",
    '  "extends": "../../tsconfig.base.json",',
    '  "compilerOptions": {',
    '    "lib": ["ESNext", "DOM", "DOM.Iterable"],',
    '    "jsx": "react-jsx"',
    "  },",
    '  "include": ["src", "../../tests/vitest.setup.ts"]',
    "}",
    "",
  ].join("\n");
}

function _buildLocale(displayName: string): string {
  return _toJsonFile({
    "plugin.name": displayName,
    "plugin.description": "Describe what this plugin adds.",
    "hello.title": "Say hello",
    "hello.message": "Hello from {pluginName}!",
  });
}

function _buildEntrySource(displayName: string): string {
  return [
    'import { definePlugin } from "@avandar/plugin-sdk";',
    "",
    "// A plugin entry exports its definition, not a component, so there is nothing",
    "// for fast refresh to track.",
    "// eslint-disable-next-line react-refresh/only-export-components",
    "export default definePlugin({",
    "  commands: {",
    "    hello: (avandar) => {",
    "      avandar.ui.notify({",
    `        message: avandar.i18n.t("hello.message", { pluginName: "${displayName}" }),`,
    "      });",
    "    },",
    "  },",
    "});",
    "",
  ].join("\n");
}

/**
 * Makes the files of a new bundled plugin with a working `hello` command,
 * keyed by path relative to the plugin's folder. `ava plugin init` writes
 * them to `plugins/<name>/`, and the result passes `ava plugin validate`
 * as written.
 */
export function makePluginScaffoldFilesFromName(options: {
  name: string;
  publisher: string;
}): Record<string, string> {
  const { name, publisher } = options;
  const displayName = _toTitleCase(name);
  return {
    "ava.yaml": _buildManifest({ name, publisher }),
    "package.json": _buildPackageJson(name),
    "tsconfig.json": _buildTsconfig(),
    "locales/en.json": _buildLocale(displayName),
    "src/index.tsx": _buildEntrySource(displayName),
  };
}
