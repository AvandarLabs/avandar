import { fileURLToPath } from "node:url";
import { loadPipelineDefinition } from "@pipelines/shared/loadPipelineDefinition/loadPipelineDefinition";
import { describe, expect, it } from "vitest";

describe("loadPipelineDefinition", () => {
  it("loads the shipped Socrata config and maps a recorded NYC result", async () => {
    const { config, mapper } = await loadPipelineDefinition(
      fileURLToPath(
        new URL("../../socrata/socrata.pipeline.yaml", import.meta.url),
      ),
    );

    expect(
      config.drives.map((drive) => {
        return drive.baseUrl;
      }),
    ).toEqual([
      "https://data.cityofnewyork.us",
      "https://data.ny.gov",
      "https://health.data.ny.gov",
    ]);
    expect(
      mapper.mapFields(
        {
          resource: { description: "Active FHVs", attribution: "TLC" },
          classification: {
            domain_category: "Transportation",
            domain_tags: ["fhv"],
          },
        },
        "https://data.cityofnewyork.us",
      ).fields,
    ).toMatchObject({
      organization1Name: "City of New York",
      organization2Name: "TLC",
      description: "Active FHVs",
      domains: ["Transportation"],
      tags: ["fhv"],
    });
  });

  it("runs a script that imports through the pipelines alias", async () => {
    const { mapper } = await loadPipelineDefinition(
      fileURLToPath(
        new URL("../../socrata/socrata.pipeline.yaml", import.meta.url),
      ),
    );

    expect(
      mapper.mapFields(
        {
          resource: { description: 'See <a href="https://x.gov">this</a>.' },
          classification: {
            domain_metadata: [
              { key: "Dataset-Summary_Posting-Frequency", value: "Monthly" },
              {
                key: "Dataset-Summary_Office/Division",
                value: "Office of Quality",
              },
            ],
          },
        },
        "https://health.data.ny.gov",
      ).fields,
    ).toMatchObject({
      organization1Name: "State of New York",
      organization2Name: "Department of Health",
      organization3Name: "Office of Quality",
      description: "See this (https://x.gov).",
      updateFrequency: "Monthly",
    });
  });
});
