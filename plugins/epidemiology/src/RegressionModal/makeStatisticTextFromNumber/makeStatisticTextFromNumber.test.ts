import { describe, expect, it } from "vitest";
import { makeStatisticTextFromNumber } from "./makeStatisticTextFromNumber";

function _makeText(value: number, locale = "en-US"): string {
  return makeStatisticTextFromNumber({ value, locale });
}

describe("makeStatisticTextFromNumber", () => {
  it("keeps a small positive magnitude instead of rounding it to 0", () => {
    expect(_makeText(0.00001)).toBe("0.00001");
  });

  it("keeps a small negative magnitude instead of rounding it to -0", () => {
    expect(_makeText(-0.00001)).toBe("-0.00001");
  });

  it("rounds a fraction below 1 to 4 significant digits", () => {
    expect(_makeText(0.123456)).toBe("0.1235");
    expect(_makeText(0.000123456)).toBe("0.0001235");
  });

  it("rounds a value of 1 or more to 4 decimal places", () => {
    expect(_makeText(1.23456)).toBe("1.2346");
    expect(_makeText(-1.23456)).toBe("-1.2346");
    expect(_makeText(1234.56789)).toBe("1,234.5679");
  });

  it("drops trailing zeros", () => {
    expect(_makeText(2)).toBe("2");
    expect(_makeText(1.5)).toBe("1.5");
  });

  it("writes zero as 0 and never as -0", () => {
    expect(_makeText(0)).toBe("0");
    expect(_makeText(-0)).toBe("0");
  });

  it("formats with the given locale", () => {
    expect(_makeText(1234.5, "de-DE")).toBe("1.234,5");
    expect(_makeText(0.00001, "de-DE")).toBe("0,00001");
  });
});
