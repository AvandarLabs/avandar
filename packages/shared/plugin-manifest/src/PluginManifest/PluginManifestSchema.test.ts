import { PluginManifestSchema } from "@plugin-manifest/PluginManifest/PluginManifestSchema.ts";
import { describe, expect, it } from "vitest";

function _makeValidManifest(): Record<string, unknown> {
  return {
    id: "avandar.epidemiology",
    name: "%plugin.name%",
    description: "%plugin.description%",
    version: "0.1.0",
    license: "MIT",
    engines: { avandar: "^1" },
    entry: "src/index.tsx",
    icon: "chart-dots",
    permissions: ["data:context"],
    contributes: {
      commands: [
        {
          id: "regression.linear",
          title: "%regression.linear.title%",
          icon: "trending-up",
        },
      ],
      menus: {
        "dataExplorer.toolbar": [
          {
            command: "regression.linear",
            when: { numericColumnCount: { gte: 2 } },
          },
        ],
      },
    },
  };
}

function _getIssueMessages(input: unknown): string[] {
  const result = PluginManifestSchema.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map((issue) => {
        return `${issue.path.join(".")}: ${issue.message}`;
      });
}

describe("PluginManifestSchema", () => {
  it("accepts a valid manifest and defaults omitted lists", () => {
    const manifest = _makeValidManifest();
    delete manifest.permissions;
    const result = PluginManifestSchema.parse(manifest);
    expect(result.permissions).toEqual([]);
    expect(result.contributes.commands).toHaveLength(1);
  });

  it("rejects unknown keys", () => {
    expect(
      _getIssueMessages({ ..._makeValidManifest(), colour: "red" }),
    ).not.toEqual([]);
  });

  it("rejects an id that is not publisher.name", () => {
    expect(
      _getIssueMessages({ ..._makeValidManifest(), id: "Epidemiology" })[0],
    ).toContain("publisher.name");
  });

  it("rejects a version YAML would have parsed as a number", () => {
    expect(
      _getIssueMessages({ ..._makeValidManifest(), version: 1.1 })[0],
    ).toContain("quoted semver");
  });

  it("rejects a menu item that references a missing command", () => {
    const manifest = _makeValidManifest();
    manifest.contributes = {
      commands: [],
      menus: { "dataExplorer.toolbar": [{ command: "regression.linear" }] },
    };
    expect(_getIssueMessages(manifest).join("\n")).toContain(
      'unknown command "regression.linear"',
    );
  });

  it("rejects duplicate command ids", () => {
    const manifest = _makeValidManifest();
    const command = {
      id: "regression.linear",
      title: "%regression.linear.title%",
      icon: "trending-up",
    };
    manifest.contributes = { commands: [command, command], menus: {} };
    expect(_getIssueMessages(manifest).join("\n")).toContain(
      'duplicate command id "regression.linear"',
    );
  });

  it("rejects a when condition on a fact the slot does not declare", () => {
    const manifest = _makeValidManifest();
    manifest.contributes = {
      commands: [{ id: "x", title: "%x%", icon: "trending-up" }],
      menus: {
        "dataExplorer.toolbar": [
          { command: "x", when: { mapZoom: { gt: 3 } } },
        ],
      },
    };
    expect(_getIssueMessages(manifest).join("\n")).toContain(
      'unknown fact "mapZoom"',
    );
  });

  it("rejects an operator that does not fit the fact's type", () => {
    const manifest = _makeValidManifest();
    manifest.contributes = {
      commands: [{ id: "x", title: "%x%", icon: "trending-up" }],
      menus: {
        "dataExplorer.toolbar": [
          { command: "x", when: { hasResult: { gt: 1 } } },
        ],
      },
    };
    expect(_getIssueMessages(manifest).join("\n")).toContain(
      'operator "gt" does not apply to boolean fact "hasResult"',
    );
  });

  it("rejects a permission this schema version does not support", () => {
    expect(
      _getIssueMessages({
        ..._makeValidManifest(),
        permissions: ["data:read"],
      }),
    ).not.toEqual([]);
  });
});
