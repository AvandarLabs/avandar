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

  it("loads the shipped HDX config and maps a recorded CKAN package", async () => {
    const { config, mapper } = await loadPipelineDefinition(
      fileURLToPath(new URL("../../hdx/hdx.pipeline.yaml", import.meta.url)),
    );

    expect(
      config.drives.map((drive) => {
        return drive.baseUrl;
      }),
    ).toEqual(["https://data.humdata.org"]);
    expect(
      mapper.mapFields(
        {
          organization: { title: "OCHA Burkina Faso" },
          dataset_source: "World Health Organization",
          notes: "Measles cases by week.",
          caveats: "Counts for the last two weeks are provisional.",
          license_title: "Creative Commons Attribution for IGOs (CC BY-IGO)",
          dataset_date: "[2019-01-01T00:00:00 TO 2026-11-01T23:59:59]",
          groups: [{ title: "Burkina Faso" }, { title: "Mali" }],
          tags: [{ name: "measles" }, { name: "health" }],
          data_update_frequency: "7",
        },
        "https://data.humdata.org",
      ).fields,
    ).toMatchObject({
      organization1Name: "OCHA Burkina Faso",
      organization2Name: "World Health Organization",
      description: "Measles cases by week.",
      notes: "Counts for the last two weeks are provisional.",
      license: "Creative Commons Attribution for IGOs (CC BY-IGO)",
      coverageStartDate: new Date("2019-01-01T00:00:00Z"),
      coverageEndDate: new Date("2026-11-01T23:59:59Z"),
      domains: ["Health"],
      tags: ["measles", "health", "Burkina Faso", "Mali"],
      updateFrequency: "Every week",
    });
    expect(config.organizationLabels).toEqual({
      1: "Organization",
      2: "Data source",
    });
  });
});
