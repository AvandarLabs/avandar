import { readSocrataDomainMetadataValue } from "@pipelines/socrata/mappers/readSocrataDomainMetadataValue/readSocrataDomainMetadataValue";
import { describe, expect, it } from "vitest";

const RECORD = {
  classification: {
    domain_metadata: [
      { key: "Dataset-Summary_Posting-Frequency", value: "Monthly" },
      { key: "Dataset-Summary_Office/Division", value: "Office of Quality" },
    ],
  },
};

describe("readSocrataDomainMetadataValue", () => {
  it("returns the first listed key's value", () => {
    expect(
      readSocrataDomainMetadataValue(RECORD, [
        "Update_Update-Frequency",
        "Dataset-Summary_Posting-Frequency",
      ]),
    ).toBe("Monthly");
  });

  it("returns undefined when no key matches or the record has no metadata", () => {
    expect(readSocrataDomainMetadataValue(RECORD, ["Nope"])).toBeUndefined();
    expect(readSocrataDomainMetadataValue({}, ["Nope"])).toBeUndefined();
  });
});
