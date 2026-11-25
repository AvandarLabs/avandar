import { fileURLToPath } from "node:url";
import { loadCatalogFieldMapper } from "@etl/EtlConfig/loadCatalogFieldMapper/loadCatalogFieldMapper";
import { describe, expect, it, vi } from "vitest";
import type { PipelineConfig } from "@etl/EtlConfig/PipelineConfig.types";

/** The directory the fixture configs' script paths are relative to. */
const CONFIG_DIR = fileURLToPath(new URL(".", import.meta.url));
const DRIVE = "https://data.example.gov";

function _config(fields: PipelineConfig["fields"]): PipelineConfig {
  return {
    fields: { organization1_name: { value: "Example City" }, ...fields },
    drives: [{ baseUrl: DRIVE }],
  };
}

describe("loadCatalogFieldMapper", () => {
  it("maps from paths, constants, and scripts into relation fields", async () => {
    const mapper = await loadCatalogFieldMapper({
      config: _config({
        description: { from: "info.summary" },
        tags: { value: ["health", "vaccines"] },
        organization2_name: { script: "./__fixtures__/upperCaseName.ts" },
      }),
      configDir: CONFIG_DIR,
    });

    expect(
      mapper.mapFields({ name: "tlc", info: { summary: "Trips" } }, DRIVE),
    ).toEqual({
      fields: {
        organization1Name: "Example City",
        description: "Trips",
        tags: ["health", "vaccines"],
        organization2Name: `TLC (organization2_name on ${DRIVE})`,
      },
      problems: [],
    });
  });

  it("lets a drive's fields override the pipeline's, key by key", async () => {
    const mapper = await loadCatalogFieldMapper({
      config: {
        fields: {
          organization1_name: { value: "Shared" },
          description: { from: "summary" },
        },
        drives: [
          { baseUrl: DRIVE, fields: { organization1_name: { value: "Own" } } },
          { baseUrl: "https://other.example.gov" },
        ],
      },
      configDir: CONFIG_DIR,
    });

    expect(mapper.mapFields({ summary: "S" }, DRIVE).fields).toEqual({
      organization1Name: "Own",
      description: "S",
    });
    expect(
      mapper.mapFields({ summary: "S" }, "https://other.example.gov").fields
        .organization1Name,
    ).toBe("Shared");
  });

  it("imports each distinct script once, however many fields and records use it", async () => {
    const importScript = vi.fn(async (url: string) => {
      return await import(/* @vite-ignore */ url);
    });
    const mapper = await loadCatalogFieldMapper({
      config: _config({
        organization2_name: { script: "./__fixtures__/upperCaseName.ts" },
        organization3_name: { script: "__fixtures__/upperCaseName.ts" },
      }),
      configDir: CONFIG_DIR,
      importScript,
    });

    const results = Array.from({ length: 1000 }, (_, index) => {
      return mapper.mapFields({ name: `record ${index}` }, DRIVE);
    });

    expect(results[999]?.fields.organization2Name).toBe(
      `RECORD 999 (organization2_name on ${DRIVE})`,
    );

    expect(importScript).toHaveBeenCalledTimes(1);
    expect(importScript.mock.calls[0]?.[0]).toMatch(
      /^file:\/\/.*__fixtures__\/upperCaseName\.ts$/,
    );
  });

  it("nulls only the field a script throws on, and reports it", async () => {
    const mapper = await loadCatalogFieldMapper({
      config: _config({
        description: { script: "./__fixtures__/throwsOnRecord.ts" },
      }),
      configDir: CONFIG_DIR,
    });

    expect(mapper.mapFields({}, DRIVE)).toEqual({
      fields: { organization1Name: "Example City" },
      problems: [
        {
          field: "description",
          message:
            "script ./__fixtures__/throwsOnRecord.ts threw: fixture script failure",
        },
      ],
    });
  });

  it("reports a value of the wrong type and leaves the field out", async () => {
    const mapper = await loadCatalogFieldMapper({
      config: _config({ license: { from: "license" } }),
      configDir: CONFIG_DIR,
    });

    expect(mapper.mapFields({ license: 42 }, DRIVE)).toEqual({
      fields: { organization1Name: "Example City" },
      problems: [{ field: "license", message: "expected text, got number" }],
    });
  });

  it("fails to load when a script has no function default export", async () => {
    await expect(
      loadCatalogFieldMapper({
        config: _config({
          notes: { script: "./__fixtures__/noDefaultFunction.ts" },
        }),
        configDir: CONFIG_DIR,
      }),
    ).rejects.toThrow(
      "noDefaultFunction.ts must default-export a function (record, context) => value.",
    );
  });

  it("fails to load when a script does not exist", async () => {
    await expect(
      loadCatalogFieldMapper({
        config: _config({ notes: { script: "./__fixtures__/missing.ts" } }),
        configDir: CONFIG_DIR,
      }),
    ).rejects.toThrow("missing.ts");
  });

  it("omits every path a mapping consumes, and the config's omitted paths, from the record", async () => {
    const mapper = await loadCatalogFieldMapper({
      config: {
        ..._config({
          description: { from: "info.summary" },
          organization2_name: { script: "./__fixtures__/readsName.ts" },
        }),
        additionalSourceMetadata: { omit: ["license_text"] },
      },
      configDir: CONFIG_DIR,
    });

    expect(
      mapper.omitMappedPaths(
        {
          name: "tlc",
          info: { summary: "Trips", owner: "TLC" },
          license_text: "The full text.",
          title: "Trips",
        },
        DRIVE,
      ),
    ).toEqual({ info: { owner: "TLC" }, title: "Trips" });
  });

  it("keeps the paths a script reads when it does not declare them", async () => {
    const mapper = await loadCatalogFieldMapper({
      config: _config({
        organization2_name: { script: "./__fixtures__/upperCaseName.ts" },
      }),
      configDir: CONFIG_DIR,
    });

    expect(mapper.omitMappedPaths({ name: "tlc" }, DRIVE)).toEqual({
      name: "tlc",
    });
  });

  it("fails to load when a script's reads are not dotted paths", async () => {
    await expect(
      loadCatalogFieldMapper({
        config: _config({
          notes: { script: "./__fixtures__/invalidReads.ts" },
        }),
        configDir: CONFIG_DIR,
      }),
    ).rejects.toThrow(
      "invalidReads.ts must export reads as a list of dotted paths, such as organization.title.",
    );
  });

  it("refuses a drive the config does not list", async () => {
    const mapper = await loadCatalogFieldMapper({
      config: _config({}),
      configDir: CONFIG_DIR,
    });

    expect(() => {
      return mapper.mapFields({}, "https://unknown.example.gov");
    }).toThrow(
      "https://unknown.example.gov is not a drive in this pipeline's config",
    );
    expect(() => {
      return mapper.omitMappedPaths({}, "https://unknown.example.gov");
    }).toThrow(
      "https://unknown.example.gov is not a drive in this pipeline's config",
    );
  });
});
