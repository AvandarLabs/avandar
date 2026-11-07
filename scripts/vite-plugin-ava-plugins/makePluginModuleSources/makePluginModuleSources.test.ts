import { describe, expect, it } from "vitest";
import {
  makeIndexModuleSourceFromPlugins,
  makeLocalesModuleSourceFromPlugin,
  makeManifestModuleSourceFromPlugin,
} from "./makePluginModuleSources";
import type { PluginDirectory } from "@avandar/plugin-manifest/node";

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
      },
    },
    strings: { en: { t: "Linear regression" } },
  },
  locales: { en: { t: "Linear regression", "modal.fit": "Fit regression" } },
} as unknown as PluginDirectory;

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
});

describe("makeLocalesModuleSourceFromPlugin", () => {
  it("exports every locale file", () => {
    expect(makeLocalesModuleSourceFromPlugin(PLUGIN)).toBe(
      'export default {"en":{"t":"Linear regression","modal.fit":"Fit regression"}};\n',
    );
  });
});
