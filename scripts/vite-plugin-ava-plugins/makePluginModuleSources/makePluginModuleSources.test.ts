import { describe, expect, it } from "vitest";
import {
  makeIndexModuleSourceFromPlugins,
  makeLocalesModuleSourceFromPlugin,
  makeManifestModuleSourceFromPlugin,
} from "./makePluginModuleSources";
import type { PluginDirectory } from "@avandar/plugin-manifest/node";

// A partial fixture: it carries only the fields the module sources read, so
// the cast skips filling in the rest of the manifest and directory shape.
const PLUGIN = {
  folderName: "epidemiology",
  directory: "/repo/plugins/epidemiology",
  entryPath: "/repo/plugins/epidemiology/src/index.tsx",
  compiled: {
    manifest: {
      id: "avandar.epidemiology",
      icon: "chart-dots",
      contributes: {
        commands: [
          { id: "regression.linear", title: "%t%", icon: "trending-up" },
        ],
        menus: {},
        vizTypes: [],
      },
    },
    strings: { en: { t: "Linear regression" } },
  },
  locales: { en: { t: "Linear regression", "modal.fit": "Fit regression" } },
} as unknown as PluginDirectory;

/** A copy of `PLUGIN` whose plugin icon and command icons are replaced. */
function _makePluginWithIcons(options: {
  pluginIcon: string;
  commandIcons: string[];
}): PluginDirectory {
  const { manifest } = PLUGIN.compiled;
  return {
    ...PLUGIN,
    compiled: {
      ...PLUGIN.compiled,
      manifest: {
        ...manifest,
        icon: options.pluginIcon,
        contributes: {
          ...manifest.contributes,
          commands: options.commandIcons.map((icon, index) => {
            return { id: `command.${index}`, title: "%t%", icon };
          }),
        },
      },
    },
  } as unknown as PluginDirectory;
}

/** A copy of `PLUGIN` that declares one viz type per icon name. */
function _makePluginWithVizTypeIcons(vizTypeIcons: string[]): PluginDirectory {
  const { manifest } = PLUGIN.compiled;
  return {
    ...PLUGIN,
    compiled: {
      ...PLUGIN.compiled,
      manifest: {
        ...manifest,
        contributes: {
          ...manifest.contributes,
          vizTypes: vizTypeIcons.map((icon, index) => {
            return {
              id: `chart-${index}`,
              title: "%t%",
              icon,
              render: "transform" as const,
              settings: [],
            };
          }),
        },
      },
    },
  };
}

function _getIconImportBindings(code: string): string[] {
  const importList = /^import \{ (.*) \} from "@tabler\/icons-react";$/m.exec(
    code,
  )?.[1];
  return importList === undefined ? [] : importList.split(", ");
}

describe("makeIndexModuleSourceFromPlugins", () => {
  it("emits lazy loaders with root-relative entry paths and no eager imports", () => {
    const code = makeIndexModuleSourceFromPlugins({
      plugins: [PLUGIN],
      repoRoot: "/repo",
    });
    expect(code).not.toMatch(/^import /m);
    expect(code).toContain('id: "avandar.epidemiology"');
    expect(code).toContain(
      'import("virtual:ava-plugin-manifest/avandar.epidemiology")',
    );
    expect(code).toContain('import("/plugins/epidemiology/src/index.tsx")');
    expect(code).toContain(
      'import("virtual:ava-plugin-locales/avandar.epidemiology")',
    );
  });

  it("emits an empty index when nothing is bundled", () => {
    expect(
      makeIndexModuleSourceFromPlugins({ plugins: [], repoRoot: "/repo" }),
    ).toBe("export const PLUGIN_INDEX = [\n\n];\n");
  });
});

describe("makeManifestModuleSourceFromPlugin", () => {
  it("imports each distinct icon once and exports manifest, strings, icons", () => {
    const code = makeManifestModuleSourceFromPlugin(PLUGIN);
    expect(code).toContain(
      'import { IconChartDots, IconTrendingUp } from "@tabler/icons-react";',
    );
    expect(code).toContain(
      'export const manifest = {"id":"avandar.epidemiology"',
    );
    expect(code).toContain(
      'export const strings = {"en":{"t":"Linear regression"}};',
    );
    expect(code).toContain(
      'export const icons = { "chart-dots": IconChartDots, "trending-up": IconTrendingUp };',
    );
  });

  it("imports the icon each viz type names", () => {
    const code = makeManifestModuleSourceFromPlugin(
      _makePluginWithVizTypeIcons(["chart-histogram"]),
    );
    expect(_getIconImportBindings(code)).toEqual([
      "IconChartDots",
      "IconTrendingUp",
      "IconChartHistogram",
    ]);
  });
});

describe("makeManifestModuleSourceFromPlugin icon deduplication", () => {
  it("imports one binding when a command reuses the plugin icon", () => {
    const code = makeManifestModuleSourceFromPlugin(
      _makePluginWithIcons({
        pluginIcon: "chart-dots",
        commandIcons: ["chart-dots"],
      }),
    );
    expect(_getIconImportBindings(code)).toEqual(["IconChartDots"]);
    expect(code).toContain(
      'export const icons = { "chart-dots": IconChartDots };',
    );
  });

  it("imports one binding for icon names that map to the same component", () => {
    const code = makeManifestModuleSourceFromPlugin(
      _makePluginWithIcons({
        pluginIcon: "number-1",
        commandIcons: ["number1"],
      }),
    );
    expect(_getIconImportBindings(code)).toEqual(["IconNumber1"]);
    expect(code).toContain(
      'export const icons = { "number-1": IconNumber1, "number1": IconNumber1 };',
    );
  });
});

describe("makeLocalesModuleSourceFromPlugin", () => {
  it("exports every locale file", () => {
    expect(makeLocalesModuleSourceFromPlugin(PLUGIN)).toBe(
      'export default {"en":{"t":"Linear regression","modal.fit":"Fit regression"}};\n',
    );
  });
});
