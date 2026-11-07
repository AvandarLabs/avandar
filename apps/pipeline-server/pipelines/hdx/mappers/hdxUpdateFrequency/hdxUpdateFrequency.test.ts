import hdxUpdateFrequency from "@pipelines/hdx/mappers/hdxUpdateFrequency/hdxUpdateFrequency";
import { describe, expect, it } from "vitest";

describe("hdxUpdateFrequency", () => {
  it("turns each known code into words", () => {
    expect(
      ["0", "1", "7", "14", "30", "90", "180", "365", "-1", "-2"].map(
        (code) => {
          return hdxUpdateFrequency({ data_update_frequency: code });
        },
      ),
    ).toEqual([
      "Live",
      "Every day",
      "Every week",
      "Every two weeks",
      "Every month",
      "Every three months",
      "Every six months",
      "Every year",
      "Never",
      "As needed",
    ]);
  });

  it("keeps an unknown code as written", () => {
    expect(hdxUpdateFrequency({ data_update_frequency: "45" })).toBe("45");
  });

  it("returns undefined when the record has no update frequency", () => {
    expect([hdxUpdateFrequency({}), hdxUpdateFrequency(null)]).toEqual([
      undefined,
      undefined,
    ]);
  });
});
