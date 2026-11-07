import socrataOfficeDivision from "@pipelines/socrata/mappers/socrataOfficeDivision/socrataOfficeDivision";
import { describe, expect, it } from "vitest";

function buildRecord(metadata: Record<string, string>): unknown {
  return {
    classification: {
      domain_metadata: Object.entries(metadata).map(([key, value]) => {
        return { key, value };
      }),
    },
  };
}

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

  it("prefers the office or division over the organization", () => {
    expect(
      socrataOfficeDivision(
        buildRecord({
          "Dataset-Summary_Office/Division": "Office of Quality",
          "Dataset-Summary_Organization": "Office of Public Health",
        }),
      ),
    ).toBe("Office of Quality");
  });

  it("falls back to the organization when there is no office or division", () => {
    expect(
      socrataOfficeDivision(
        buildRecord({
          "Dataset-Summary_Organization":
            "Office of Health Services Quality and Analytics",
        }),
      ),
    ).toBe("Office of Health Services Quality and Analytics");
  });

  it("ignores an organization that names the department itself", () => {
    expect(
      socrataOfficeDivision(
        buildRecord({
          "Dataset-Summary_Organization": "New York State Department of Health",
        }),
      ),
    ).toBeUndefined();
    expect(
      socrataOfficeDivision(
        buildRecord({ "Dataset-Summary_Organization": " department of health " }),
      ),
    ).toBeUndefined();
  });
});
