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

const SETTING_PATH = "contributes.vizTypes.0.settings.0";

const DAY_AND_WEEK_OPTIONS = [
  { value: "day", label: "%viz.interval.day%" },
  { value: "week", label: "%viz.interval.week%" },
];

function _makeSetting(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    key: "interval",
    label: "%viz.interval%",
    control: { kind: "segmented", options: DAY_AND_WEEK_OPTIONS },
    ...overrides,
  };
}

function _makeVizType(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "epicurve",
    title: "%viz.epicurve.title%",
    icon: "chart-histogram",
    render: "transform",
    settings: [_makeSetting()],
    ...overrides,
  };
}

function _makeManifestWithVizTypes(
  vizTypes: unknown[],
): Record<string, unknown> {
  const manifest = _makeValidManifest();
  manifest.contributes = { commands: [], menus: {}, vizTypes };
  return manifest;
}

function _makeManifestWithSetting(
  setting: Record<string, unknown>,
): Record<string, unknown> {
  return _makeManifestWithVizTypes([_makeVizType({ settings: [setting] })]);
}

function _makeAiTool(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: "fitRegression",
    description: "Fits a line.",
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["xColumn"],
      properties: {
        xColumn: { type: "string", description: "The predictor." },
      },
    },
    ...overrides,
  };
}

function _makeManifestWithAiTools(
  aiTools: unknown[],
): Record<string, unknown> {
  const manifest = _makeValidManifest();
  manifest.contributes = {
    ...(manifest.contributes as object),
    aiTools,
  };
  return manifest;
}

function _getIssuesForAiTool(
  overrides: Record<string, unknown>,
): Array<{ path: string; message: string }> {
  return _getIssues(_makeManifestWithAiTools([_makeAiTool(overrides)]));
}

function _getIssuesForAiToolNames(
  names: string[],
): Array<{ path: string; message: string }> {
  return _getIssues(
    _makeManifestWithAiTools(
      names.map((name) => {
        return _makeAiTool({ name });
      }),
    ),
  );
}

function _getIssuesForAiToolProperty(
  property: Record<string, unknown>,
  required: string[] = [],
): Array<{ path: string; message: string }> {
  return _getIssuesForAiTool({
    parameters: {
      type: "object",
      additionalProperties: false,
      required,
      properties: { xColumn: property },
    },
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

  it("accepts the query:addColumns permission", () => {
    const result = PluginManifestSchema.parse({
      ..._makeValidManifest(),
      permissions: ["data:context", "query:addColumns"],
    });
    expect(result.permissions).toEqual(["data:context", "query:addColumns"]);
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

describe("PluginManifestSchema contributes.vizTypes", () => {
  it("defaults vizTypes to an empty list when the manifest declares none", () => {
    const result = PluginManifestSchema.parse(_makeValidManifest());
    expect(result.contributes.vizTypes).toEqual([]);
  });

  it("defaults a setting's required flag to false", () => {
    const result = PluginManifestSchema.parse(
      _makeManifestWithSetting(_makeSetting()),
    );
    expect(result.contributes.vizTypes[0]?.settings[0]?.required).toBe(false);
  });

  it("defaults a viz type's settings to an empty list", () => {
    const vizType = _makeVizType();
    delete vizType.settings;
    const result = PluginManifestSchema.parse(
      _makeManifestWithVizTypes([vizType]),
    );
    expect(result.contributes.vizTypes[0]?.settings).toEqual([]);
  });

  it.each([
    ["columnPicker", { kind: "columnPicker", dataType: "temporal" }],
    ["select", { kind: "select", options: [{ value: "a", label: "%a%" }] }],
    ["switch", { kind: "switch" }],
    ["number", { kind: "number", min: 1, max: 10, step: 1, unit: "%unit%" }],
    ["text", { kind: "text", placeholder: "%placeholder%" }],
    ["color", { kind: "color" }],
  ])("accepts a %s control", (_kind, control) => {
    expect(
      _getIssues(_makeManifestWithSetting(_makeSetting({ control }))),
    ).toEqual([]);
  });

  it("lists the known control kinds when a control kind is unknown", () => {
    const manifest = _makeManifestWithSetting(
      _makeSetting({ control: { kind: "slider" } }),
    );
    expect(_getIssues(manifest)).toEqual([
      {
        path: `${SETTING_PATH}.control.kind`,
        message:
          "must be columnPicker, select, segmented, switch, number, text, or color",
      },
    ]);
  });

  it("rejects a render mode other than transform or component", () => {
    const issues = _getIssues(
      _makeManifestWithVizTypes([_makeVizType({ render: "canvas" })]),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe("contributes.vizTypes.0.render");
  });

  it("explains the viz type id format in lowercase words", () => {
    const manifest = _makeManifestWithVizTypes([
      _makeVizType({ id: "Epi_Curve" }),
    ]);
    expect(_getIssues(manifest)).toEqual([
      {
        path: "contributes.vizTypes.0.id",
        message:
          "must be lowercase letters, digits, and hyphens, in dot-separated words",
      },
    ]);
  });

  it("rejects a setting key that does not start with a letter", () => {
    const manifest = _makeManifestWithSetting(_makeSetting({ key: "1st" }));
    expect(_getIssues(manifest)).toEqual([
      {
        path: `${SETTING_PATH}.key`,
        message: "must start with a letter and hold only letters and digits",
      },
    ]);
  });

  it("rejects duplicate viz type ids", () => {
    const manifest = _makeManifestWithVizTypes([
      _makeVizType(),
      _makeVizType(),
    ]);
    expect(_getIssues(manifest)).toEqual([
      {
        path: "contributes.vizTypes.1.id",
        message: 'duplicate viz type id "epicurve"',
      },
    ]);
  });

  it("rejects duplicate setting keys within a viz type", () => {
    const manifest = _makeManifestWithVizTypes([
      _makeVizType({ settings: [_makeSetting(), _makeSetting()] }),
    ]);
    expect(_getIssues(manifest)).toEqual([
      {
        path: "contributes.vizTypes.0.settings.1.key",
        message: 'duplicate setting key "interval"',
      },
    ]);
  });

  it("accepts the same setting key in two viz types", () => {
    const manifest = _makeManifestWithVizTypes([
      _makeVizType(),
      _makeVizType({ id: "rate-plot" }),
    ]);
    expect(_getIssues(manifest)).toEqual([]);
  });

  it("rejects duplicate option values within a control", () => {
    const manifest = _makeManifestWithSetting(
      _makeSetting({
        control: {
          kind: "segmented",
          options: [
            { value: "day", label: "%viz.interval.day%" },
            { value: "day", label: "%viz.interval.week%" },
          ],
        },
      }),
    );
    expect(_getIssues(manifest)).toEqual([
      {
        path: `${SETTING_PATH}.control.options.1.value`,
        message: 'duplicate option value "day"',
      },
    ]);
  });

  it("rejects a default on a column picker", () => {
    const manifest = _makeManifestWithSetting(
      _makeSetting({ control: { kind: "columnPicker" }, default: "date" }),
    );
    expect(_getIssues(manifest)).toEqual([
      {
        path: `${SETTING_PATH}.default`,
        message: "a column picker cannot have a default",
      },
    ]);
  });

  it.each([
    [
      "a segmented default that is not an option value",
      { kind: "segmented", options: DAY_AND_WEEK_OPTIONS },
      "month",
      "must be one of the option values: day, week",
    ],
    [
      "a select default that is not an option value",
      { kind: "select", options: [{ value: "a", label: "%a%" }] },
      "b",
      "must be one of the option values: a",
    ],
    [
      "a switch default that is not a boolean",
      { kind: "switch" },
      "yes",
      "must be true or false for a switch",
    ],
    [
      "a number default that is not a number",
      { kind: "number" },
      "5",
      "must be a number for a number control",
    ],
    [
      "a number default below min",
      { kind: "number", min: 1 },
      0,
      "must be at least 1",
    ],
    [
      "a number default above max",
      { kind: "number", max: 10 },
      11,
      "must be at most 10",
    ],
    [
      "a text default that is not a string",
      { kind: "text" },
      5,
      "must be a string for a text control",
    ],
    [
      "a color default that is not a string",
      { kind: "color" },
      true,
      "must be a string for a color control",
    ],
  ])("rejects %s", (_label, control, defaultValue, message) => {
    const manifest = _makeManifestWithSetting(
      _makeSetting({ control, default: defaultValue }),
    );
    expect(_getIssues(manifest)).toEqual([
      { path: `${SETTING_PATH}.default`, message },
    ]);
  });

  it.each([
    ["segmented", { kind: "segmented", options: DAY_AND_WEEK_OPTIONS }, "week"],
    ["switch", { kind: "switch" }, true],
    ["number", { kind: "number", min: 1, max: 10 }, 10],
    ["text", { kind: "text" }, "Cases"],
    ["color", { kind: "color" }, "#228be6"],
  ])("accepts a %s default that fits the control", (_kind, control, value) => {
    const manifest = _makeManifestWithSetting(
      _makeSetting({ control, default: value }),
    );
    expect(_getIssues(manifest)).toEqual([]);
  });

  it("rejects a number control whose min is greater than its max", () => {
    const manifest = _makeManifestWithSetting(
      _makeSetting({ control: { kind: "number", min: 10, max: 1 } }),
    );
    expect(_getIssues(manifest)).toEqual([
      {
        path: `${SETTING_PATH}.control.min`,
        message: "must not be greater than max (1)",
      },
    ]);
  });
});

describe("PluginManifestSchema contributes.aiTools", () => {
  it("accepts an ai tool whose parameters are strings", () => {
    const parsed = PluginManifestSchema.parse(
      _makeManifestWithAiTools([_makeAiTool()]),
    );
    expect(parsed.contributes.aiTools[0]?.name).toBe("fitRegression");
  });

  it("defaults aiTools to an empty list", () => {
    const parsed = PluginManifestSchema.parse(_makeValidManifest());
    expect(parsed.contributes.aiTools).toEqual([]);
  });

  it.each([
    ["a dotted name", () => {return _getIssuesForAiTool({ name: "fit.regression" })}],
    [
      "a duplicate name",
      () => {return _getIssuesForAiToolNames(["fitRegression", "fitRegression"])},
    ],
    ["an object property", () => {return _getIssuesForAiToolProperty({ type: "object" })}],
    ["an array property", () => {return _getIssuesForAiToolProperty({ type: "array" })}],
    [
      "a 601-character description",
      () => {return _getIssuesForAiTool({ description: "a".repeat(601) })},
    ],
    [
      "a 201-character parameter description",
      () =>
        {return _getIssuesForAiToolProperty({
          type: "string",
          description: "a".repeat(201),
        })},
    ],
    [
      "a required entry that is not a property name",
      () => {return _getIssuesForAiToolProperty({ type: "string" }, ["yColumn"])},
    ],
    [
      "an enum whose values do not match the property type",
      () => {return _getIssuesForAiToolProperty({ type: "string", enum: [1, 2] })},
    ],
  ])("rejects an ai tool with %s", (_label, getIssuesFromCase) => {
    // Anchored to the aiTools path so an unrelated issue cannot satisfy it.
    const paths = getIssuesFromCase().map((issue) => {
      return issue.path;
    });
    expect(
      paths.some((path) => {
        return path.startsWith("contributes.aiTools.");
      }),
    ).toBe(true);
  });

  it("rejects a tool description that is a localization key", () => {
    const issues = _getIssuesForAiTool({ description: "%tool.description%" });
    expect(issues).toEqual([
      {
        path: "contributes.aiTools.0.description",
        message: "must be plain text, not a %key% reference",
      },
    ]);
  });

  it("rejects a parameter description that is a localization key", () => {
    const issues = _getIssuesForAiToolProperty(
      { type: "string", description: "%param.description%" },
      ["xColumn"],
    );
    expect(issues).toEqual([
      {
        path: "contributes.aiTools.0.parameters.properties.xColumn.description",
        message: "must be plain text, not a %key% reference",
      },
    ]);
  });

  it("accepts an enum whose values match the property type", () => {
    const issues = _getIssuesForAiToolProperty(
      { type: "number", enum: [1, 2] },
      ["xColumn"],
    );
    expect(issues).toEqual([]);
  });
});
