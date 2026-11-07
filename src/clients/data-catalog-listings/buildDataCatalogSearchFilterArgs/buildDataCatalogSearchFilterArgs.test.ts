import { describe, expect, it } from "vitest";
import { buildDataCatalogSearchFilterArgs } from "@/clients/data-catalog-listings/buildDataCatalogSearchFilterArgs/buildDataCatalogSearchFilterArgs";

describe("buildDataCatalogSearchFilterArgs", () => {
  it("passes each filter as the argument the search RPCs take", () => {
    expect(
      buildDataCatalogSearchFilterArgs({
        sources: ["World Bank"],
        organization2Names: ["Department of Health"],
        domains: ["Transportation"],
        tags: ["taxi", "fhv"],
        formats: ["CSV", "PARQUET"],
        updatedWithin: "any",
        isLoadableOnly: true,
      }),
    ).toEqual({
      p_sources: ["World Bank"],
      p_organization2_names: ["Department of Health"],
      p_domains: ["Transportation"],
      p_tags: ["taxi", "fhv"],
      p_formats: ["CSV", "PARQUET"],
      p_updated_within: "any",
      p_is_loadable_only: true,
    });
  });

  it("writes each update window in the snake case Postgres expects", () => {
    const toArg = (
      updatedWithin: "pastMonth" | "pastYear" | "overAYear",
    ): string => {
      return buildDataCatalogSearchFilterArgs({
        sources: [],
        organization2Names: [],
        domains: [],
        tags: [],
        formats: [],
        updatedWithin,
        isLoadableOnly: false,
      }).p_updated_within;
    };

    expect(toArg("pastMonth")).toBe("past_month");
    expect(toArg("pastYear")).toBe("past_year");
    expect(toArg("overAYear")).toBe("over_a_year");
  });
});
