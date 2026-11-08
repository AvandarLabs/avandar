import { makePluginTranslator } from "@avandar/plugin-sdk";
import { describe, expect, it } from "vitest";
import englishMessages from "../../../locales/en.json";
import { makeRateTextFromPoint } from "./makeRateTextFromPoint";
import type { RatePlotPoint } from "../makeRatePlotPointsFromRows/makeRatePlotPointsFromRows";

const BRONX: RatePlotPoint = {
  label: "Bronx",
  rate: 12.4,
  lower: 9.8,
  upper: 15.6,
};

function _makeText(point: RatePlotPoint, locale = "en-US"): string {
  return makeRateTextFromPoint({
    point,
    t: makePluginTranslator({ locale, messages: { en: englishMessages } }),
  });
}

describe("makeRateTextFromPoint", () => {
  it("writes the rate followed by its interval", () => {
    expect(_makeText(BRONX)).toBe("12.4 (9.8–15.6)");
  });

  it("formats the numbers in the translator's locale", () => {
    expect(_makeText(BRONX, "de-DE")).toBe("12,4 (9,8–15,6)");
  });

  it("writes only the rate when a bound is missing", () => {
    expect(_makeText({ ...BRONX, upper: undefined })).toBe("12.4");
  });

  it("groups the digits of a large rate", () => {
    expect(
      _makeText({ label: "All", rate: 1234.5, lower: 1000, upper: 1500 }),
    ).toBe("1,234.5 (1,000–1,500)");
  });
});
