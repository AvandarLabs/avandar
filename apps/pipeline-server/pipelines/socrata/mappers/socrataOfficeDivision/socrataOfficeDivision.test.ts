import socrataOfficeDivision from "@pipelines/socrata/mappers/socrataOfficeDivision/socrataOfficeDivision";
import { describe, expect, it } from "vitest";

describe("socrataOfficeDivision", () => {
  it("reads the office or division from the custom metadata", () => {
    expect(
      socrataOfficeDivision({
        classification: {
          domain_metadata: [
            {
              key: "Dataset-Summary_Office/Division",
              value: "Office of Quality",
            },
          ],
        },
      }),
    ).toBe("Office of Quality");
  });

  it("returns undefined when the record has no office or division", () => {
    expect(socrataOfficeDivision({})).toBeUndefined();
  });
});
