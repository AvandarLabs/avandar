import { parsePipelineConfig } from "@etl/EtlConfig/parsePipelineConfig/parsePipelineConfig";
import { describe, expect, it } from "vitest";

function _parse(lines: readonly string[]) {
  return parsePipelineConfig({
    yamlText: lines.join("\n"),
    sourceName: "test.pipeline.yaml",
  });
}

describe("parsePipelineConfig", () => {
  it("reads labels, shared fields, and drives with their own overrides", () => {
    const config = _parse([
      "organizationLabels:",
      "  1: City",
      "  2: Agency",
      "fields:",
      "  description: { from: resource.description }",
      "  domains: { script: ./mappers/domains.ts }",
      "drives:",
      "  - baseUrl: https://data.example.gov",
      "    organizationLabels: { 1: State }",
      "    fields:",
      "      organization1_name: { value: State of Example }",
      "      tags: { value: [health, vaccines] }",
      "    scopes: [{ key: health, categories: [Health] }]",
    ]);

    expect(config).toEqual({
      organizationLabels: { 1: "City", 2: "Agency" },
      fields: {
        description: { from: "resource.description" },
        domains: { script: "./mappers/domains.ts" },
      },
      drives: [
        {
          baseUrl: "https://data.example.gov",
          organizationLabels: { 1: "State" },
          fields: {
            organization1_name: { value: "State of Example" },
            tags: { value: ["health", "vaccines"] },
          },
          scopes: [{ key: "health", categories: ["Health"] }],
        },
      ],
    });
  });

  it("reads this pipeline's workspace loadability overrides", () => {
    const config = _parse([
      "workspaceLoadability:",
      "  loadableFormats: [XLSX]",
      "drives: []",
    ]);

    expect(config.workspaceLoadability).toEqual({ loadableFormats: ["XLSX"] });
  });

  it("refuses a field that is not mappable, naming it", () => {
    expect(() => {
      return _parse([
        "fields:",
        "  display_name: { from: resource.name }",
        "drives: []",
      ]);
    }).toThrow(/test\.pipeline\.yaml[\s\S]*display_name/);
  });

  it("refuses a mapping that sets two sources", () => {
    expect(() => {
      return _parse([
        "drives:",
        "  - baseUrl: https://data.example.gov",
        "    fields:",
        "      organization1_name: { value: A, from: resource.name }",
      ]);
    }).toThrow("must set exactly one of from, value, or script");
  });

  it("refuses a from path that is not dotted segments", () => {
    expect(() => {
      return _parse([
        "drives:",
        "  - baseUrl: https://data.example.gov",
        "    fields:",
        "      organization1_name: { from: 'tags[].name' }",
      ]);
    }).toThrow("organization1_name.from");
  });

  it("refuses a drive that maps no organization1_name, naming the drive", () => {
    expect(() => {
      return _parse(["drives:", "  - baseUrl: https://data.example.gov"]);
    }).toThrow(
      "Drive https://data.example.gov does not map organization1_name",
    );
  });

  it("accepts organization1_name from the pipeline's shared fields", () => {
    const config = _parse([
      "fields:",
      "  organization1_name: { value: Shared Org }",
      "drives:",
      "  - baseUrl: https://data.example.gov",
    ]);

    expect(config.drives).toHaveLength(1);
  });

  it.each([
    ["not https", "http://data.example.gov"],
    ["a trailing slash", "https://data.example.gov/"],
  ])("refuses a baseUrl with %s", (_name, baseUrl) => {
    expect(() => {
      return _parse([
        "fields:",
        "  organization1_name: { value: Org }",
        "drives:",
        `  - baseUrl: ${baseUrl}`,
      ]);
    }).toThrow("baseUrl");
  });

  it("refuses two drives with the same baseUrl", () => {
    expect(() => {
      return _parse([
        "fields:",
        "  organization1_name: { value: Org }",
        "drives:",
        "  - baseUrl: https://data.example.gov",
        "  - baseUrl: https://data.example.gov",
      ]);
    }).toThrow("Drive https://data.example.gov is listed twice");
  });

  it("refuses an unknown top-level key", () => {
    expect(() => {
      return _parse(["drive: []"]);
    }).toThrow("test.pipeline.yaml is not a valid pipeline config");
  });

  it("refuses a label level outside 1-4", () => {
    expect(() => {
      return _parse(["organizationLabels: { 5: Ward }", "drives: []"]);
    }).toThrow("organizationLabels");
  });

  it("names the file when the YAML has a syntax error", () => {
    expect(() => {
      return _parse(["drives: [", "  - baseUrl: : :"]);
    }).toThrow(/^test\.pipeline\.yaml is not valid YAML: /);
  });

  it.each([
    ["a number", "2024"],
    ["a boolean", "true"],
  ])("explains that a value mapping cannot be %s", (_label, literal) => {
    expect(() => {
      return _parse([
        "drives:",
        "  - baseUrl: https://data.example.gov",
        "    fields:",
        `      organization1_name: { value: ${literal} }`,
      ]);
    }).toThrow("value must be text or a list of text");
  });
});
