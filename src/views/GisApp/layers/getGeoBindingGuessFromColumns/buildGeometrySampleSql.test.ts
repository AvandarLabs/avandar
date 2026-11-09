import { describe, expect, it } from "vitest";
import { buildGeometrySampleSql } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/buildGeometrySampleSql";

describe("buildGeometrySampleSql", () => {
  it("quotes the table and the sampled columns", () => {
    expect(
      buildGeometrySampleSql({
        tableName: "a1b2-c3d4",
        columnNames: ["location", "the_geom"],
      }),
    ).toBe('SELECT "location", "the_geom" FROM "a1b2-c3d4" LIMIT 32');
  });
});
