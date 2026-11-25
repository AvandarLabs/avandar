import socrataUpdateFrequency from "@pipelines/socrata/mappers/socrataUpdateFrequency/socrataUpdateFrequency";
import { describe, expect, it } from "vitest";

describe("socrataUpdateFrequency", () => {
  it("reads NYC's update frequency", () => {
    expect(
      socrataUpdateFrequency({
        classification: {
          domain_metadata: [{ key: "Update_Update-Frequency", value: "Daily" }],
        },
      }),
    ).toBe("Daily");
  });

  it("returns undefined when the record has no update frequency", () => {
    expect(socrataUpdateFrequency({})).toBeUndefined();
  });
});
