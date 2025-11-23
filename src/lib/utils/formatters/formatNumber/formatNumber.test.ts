import { beforeAll, describe, expect, it, vi } from "vitest";

let formatNumber: typeof import("./formatNumber").formatNumber;

describe("formatNumber caching", () => {
  it("reuses Intl.NumberFormat instances for identical option sets", async () => {
    vi.resetModules();

    const formatSpy = vi.fn((value: number) => {
      return `formatted-${value}`;
    });
    const numberFormatSpy = vi
      .spyOn(Intl, "NumberFormat")
      .mockImplementation(() => {
        return {
          format: formatSpy,
        } as unknown as Intl.NumberFormat;
      });

    try {
      const { formatNumber: freshFormatNumber } = await import("./formatNumber");
      const first = freshFormatNumber(100, { locale: "en-US" });
      const second = freshFormatNumber(200, { locale: "en-US" });
      const third = freshFormatNumber(300, {
        locale: "en-US",
        style: "currency",
        currency: "USD",
      });

      expect(first).toBe("formatted-100");
      expect(second).toBe("formatted-200");
      expect(third).toBe("formatted-300");
      expect(numberFormatSpy).toHaveBeenCalledTimes(2);
      expect(formatSpy).toHaveBeenNthCalledWith(1, 100);
      expect(formatSpy).toHaveBeenNthCalledWith(2, 200);
      expect(formatSpy).toHaveBeenNthCalledWith(3, 300);
    } finally {
      numberFormatSpy.mockRestore();
      vi.resetModules();
    }
  });
});

describe("formatNumber", () => {
  beforeAll(async () => {
    ({ formatNumber } = await import("./formatNumber"));
  });

  it("returns an empty string for NaN or infinite values", () => {
    expect(formatNumber(Number.NaN)).toBe("");
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("");
    expect(formatNumber(Number.NEGATIVE_INFINITY)).toBe("");
  });

  it("formats decimal numbers with locale-aware grouping by default", () => {
    expect(formatNumber(1234.5, { locale: "en-US" })).toBe("1,234.5");
  });

  it("respects explicit fraction digit boundaries", () => {
    expect(
      formatNumber(12.3, {
        locale: "en-US",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    ).toBe("12.30");
  });

  it("formats currency values with a USD fallback", () => {
    expect(formatNumber(123, { locale: "en-US", style: "currency" })).toBe(
      "$123.00",
    );
  });

  it("supports custom currency display and accounting sign behavior", () => {
    expect(
      formatNumber(-1234.5, {
        locale: "en-US",
        style: "currency",
        currency: "EUR",
        currencySign: "accounting",
      }),
    ).toBe("(€1,234.50)");
  });

  it("formats percentages and applies rounding options", () => {
    expect(
      formatNumber(0.254, {
        locale: "en-US",
        style: "percent",
        maximumFractionDigits: 1,
      }),
    ).toBe("25.4%");
  });

  it("formats unit style values using the requested unit display", () => {
    expect(
      formatNumber(1234, {
        locale: "en-US",
        style: "unit",
        unit: "kilometer",
        unitDisplay: "narrow",
      }),
    ).toBe("1,234km");
  });

  it("supports compact notation for large numbers", () => {
    expect(
      formatNumber(1500, {
        locale: "en-US",
        notation: "compact",
        compactDisplay: "short",
      }),
    ).toBe("1.5K");
  });

  it("can disable digit grouping or control integer padding", () => {
    expect(
      formatNumber(12345, { locale: "en-US", useGrouping: false }),
    ).toBe("12345");
    expect(
      formatNumber(42, {
        locale: "en-US",
        minimumIntegerDigits: 4,
        useGrouping: false,
      }),
    ).toBe("0042");
  });

  it("honors sign display and trailing zero behavior", () => {
    expect(formatNumber(0, { locale: "en-US", signDisplay: "always" })).toBe(
      "+0",
    );
    expect(
      formatNumber(12, {
        locale: "en-US",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        trailingZeroDisplay: "stripIfInteger",
      }),
    ).toBe("12");
  });

  it("passes rounding modes through to Intl.NumberFormat", () => {
    expect(
      formatNumber(1.25, {
        locale: "en-US",
        maximumFractionDigits: 1,
        roundingMode: "halfFloor",
      }),
    ).toBe("1.2");
  });
});
