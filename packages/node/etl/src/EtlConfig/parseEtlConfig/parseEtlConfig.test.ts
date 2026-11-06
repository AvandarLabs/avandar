import { parseEtlConfig } from "@etl/EtlConfig/parseEtlConfig/parseEtlConfig";
import { describe, expect, it } from "vitest";

describe("parseEtlConfig", () => {
  it("reads the global unloadable formats and each pipeline's overrides", () => {
    const config = parseEtlConfig({
      yamlText: [
        "workspaceLoadability:",
        "  unloadableFormats: [PDF, XLSX]",
        "pipelines:",
        "  hdx:",
        "    workspaceLoadability:",
        "      loadableFormats: [XLSX]",
        "      unloadableFormats: [JSON]",
      ].join("\n"),
      sourceName: "etl.config.yaml",
    });

    expect(config).toEqual({
      workspaceLoadability: { unloadableFormats: ["PDF", "XLSX"] },
      pipelines: {
        hdx: {
          workspaceLoadability: {
            loadableFormats: ["XLSX"],
            unloadableFormats: ["JSON"],
          },
        },
      },
    });
  });

  it("treats an empty file as no rules", () => {
    expect(
      parseEtlConfig({ yamlText: "", sourceName: "etl.config.yaml" }),
    ).toEqual({
      workspaceLoadability: { unloadableFormats: [] },
      pipelines: {},
    });
  });

  it("names the file and the key when a key is misspelled", () => {
    expect(() => {
      return parseEtlConfig({
        yamlText: "workspaceLoadability:\n  unloadableFormat: [PDF]\n",
        sourceName: "etl.config.yaml",
      });
    }).toThrow(/etl\.config\.yaml.*unloadableFormat/s);
  });

  it("names the file when a format is not a string", () => {
    expect(() => {
      return parseEtlConfig({
        yamlText: "workspaceLoadability:\n  unloadableFormats: [1]\n",
        sourceName: "etl.config.yaml",
      });
    }).toThrow(/etl\.config\.yaml/);
  });
});
