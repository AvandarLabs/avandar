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

function _makeManifestWithWhen(when: unknown): Record<string, unknown> {
  const manifest = _makeValidManifest();
  manifest.contributes = {
    commands: [{ id: "x", title: "%x%", icon: "trending-up" }],
    menus: { "dataExplorer.toolbar": [{ command: "x", when }] },
  };
  return manifest;
}

function _getIssues(input: unknown): Array<{ path: string; message: string }> {
  const result = PluginManifestSchema.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map((issue) => {
        return { path: issue.path.join("."), message: issue.message };
      });
}

function _getIssueMessages(input: unknown): string[] {
  return _getIssues(input).map((issue) => {
    return `${issue.path}: ${issue.message}`;
  });
}

const WHEN_PATH = "contributes.menus.dataExplorer.toolbar.0.when";

describe("PluginManifestSchema", () => {
  it("accepts a valid manifest and defaults omitted lists", () => {
    const manifest = _makeValidManifest();
    delete manifest.permissions;
    const result = PluginManifestSchema.parse(manifest);
    expect(result.permissions).toEqual([]);
    expect(result.contributes.commands).toHaveLength(1);
  });

  it("rejects unknown keys and names the offending key", () => {
    const result = PluginManifestSchema.safeParse({
      ..._makeValidManifest(),
      colour: "red",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toMatchObject([
      { code: "unrecognized_keys", keys: ["colour"], path: [] },
    ]);
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
    const issues = _getIssues({
      ..._makeValidManifest(),
      permissions: ["data:read"],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe("permissions.0");
  });

  it("rejects an invalid fact nested inside all, not, and any", () => {
    const manifest = _makeManifestWithWhen({
      all: [{ not: { any: [{ mapZoom: { gt: 3 } }] } }],
    });
    expect(_getIssues(manifest)).toMatchObject([
      {
        path: `${WHEN_PATH}.all.0.not.any.0`,
        message: expect.stringContaining('unknown fact "mapZoom"'),
      },
    ]);
  });

  it("rejects a value whose type does not fit the fact", () => {
    const manifest = _makeManifestWithWhen({
      numericColumnCount: { gte: "2" },
    });
    expect(_getIssues(manifest)).toMatchObject([
      {
        path: `${WHEN_PATH}.numericColumnCount.gte`,
        message: expect.stringContaining(
          '"numericColumnCount" is a number fact',
        ),
      },
    ]);
  });

  it("rejects in with a single value instead of a list", () => {
    const manifest = _makeManifestWithWhen({ rowCount: { in: 3 } });
    expect(_getIssues(manifest)).toEqual([
      {
        path: `${WHEN_PATH}.rowCount.in`,
        message: '"in" needs a non-empty list of values for "rowCount"',
      },
    ]);
  });

  it("rejects in with an empty list", () => {
    const manifest = _makeManifestWithWhen({ rowCount: { in: [] } });
    expect(_getIssues(manifest)).toEqual([
      {
        path: `${WHEN_PATH}.rowCount.in`,
        message: '"in" needs a non-empty list of values for "rowCount"',
      },
    ]);
  });

  it("rejects a non-in operator given a list", () => {
    const manifest = _makeManifestWithWhen({ rowCount: { gte: [2] } });
    expect(_getIssues(manifest)).toEqual([
      {
        path: `${WHEN_PATH}.rowCount.gte`,
        message: '"gte" needs a single number for "rowCount"',
      },
    ]);
  });

  it("accepts in with a non-empty list of values of the fact's type", () => {
    const manifest = _makeManifestWithWhen({ rowCount: { in: [1, 2] } });
    expect(_getIssues(manifest)).toEqual([]);
  });

  it("explains the valid when shapes when an operator is misspelled", () => {
    const manifest = _makeManifestWithWhen({ rowCount: { gtee: 2 } });
    const issues = _getIssues(manifest);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe(WHEN_PATH);
    expect(issues[0]?.message).toContain("all: [...]");
    expect(issues[0]?.message).toContain("any: [...]");
    expect(issues[0]?.message).toContain("not: ...");
    expect(issues[0]?.message).toContain("{ <fact>: { <operator>: value } }");
    expect(issues[0]?.message).toContain("eq, ne, gt, gte, lt, lte, in");
  });

  it.each([
    ["all is an object instead of a list", { all: { rowCount: { gt: 1 } } }],
    ["an extra key sits beside all", { all: [{ rowCount: { gt: 1 } }], x: 1 }],
  ])("explains the valid when shapes when %s", (_name, when) => {
    const issues = _getIssues(_makeManifestWithWhen(when));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe(WHEN_PATH);
    expect(issues[0]?.message).toContain("all: [...]");
  });

  it.each([["all"], ["any"]])(
    "reports an empty %s list as needing at least one condition",
    (combinator) => {
      const manifest = _makeManifestWithWhen({ [combinator]: [] });
      expect(_getIssues(manifest)).toEqual([
        {
          path: `${WHEN_PATH}.${combinator}`,
          message: "needs at least one condition",
        },
      ]);
    },
  );

  it("explains the valid when shapes for a malformed nested condition", () => {
    const manifest = _makeManifestWithWhen({
      all: [{ rowCount: { gtee: 2 } }],
    });
    const issues = _getIssues(manifest);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe(WHEN_PATH);
    expect(issues[0]?.message).toContain("all: [...]");
  });

  it("lists the valid slots when a menu names an unknown slot", () => {
    const manifest = _makeValidManifest();
    manifest.contributes = {
      commands: [{ id: "x", title: "%x%", icon: "trending-up" }],
      menus: { "gis.toolbar": [{ command: "x" }] },
    };
    const issues = _getIssues(manifest);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe("contributes.menus.gis.toolbar");
    expect(issues[0]?.message).toContain('unknown slot "gis.toolbar"');
    expect(issues[0]?.message).toContain("dataExplorer.toolbar");
  });

  it("explains the command id format in lowercase words", () => {
    const manifest = _makeValidManifest();
    manifest.contributes = {
      commands: [{ id: "Bad_Id", title: "%x%", icon: "trending-up" }],
      menus: {},
    };
    const issues = _getIssues(manifest);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe("contributes.commands.0.id");
    expect(issues[0]?.message).toBe(
      "must be lowercase letters, digits, and hyphens, in dot-separated words",
    );
  });
});
