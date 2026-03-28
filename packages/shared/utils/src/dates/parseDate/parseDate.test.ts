import { normalizeDateInputString } from "@utils/dates/date-utils/normalizeDateInputString.ts";
import { parseDate } from "@utils/dates/parseDate/parseDate.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.stubEnv("TZ", "UTC");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("normalizeDateInputString", () => {
  it("maps spaces and punctuation to dashes and collapses repeats", () => {
    expect(normalizeDateInputString("2024/06/15 14:05")).toBe(
      "2024-06-15-14-05",
    );
  });

  it("inserts a dash before a trailing Z after a digit", () => {
    expect(normalizeDateInputString("2024-06-15T14:05:07Z")).toBe(
      "2024-06-15-14-05-07-Z",
    );
  });
});

describe("parseDate", () => {
  describe("numbers", () => {
    it("parses finite epoch milliseconds", () => {
      const d = parseDate(1_705_813_200_000);
      expect(d?.toISOString()).toBe("2024-01-21T05:00:00.000Z");
    });

    it("returns undefined for non-finite numbers", () => {
      expect(parseDate(Number.NaN)).toBeUndefined();
      expect(parseDate(Number.POSITIVE_INFINITY)).toBeUndefined();
    });
  });

  describe("native Date.parse path", () => {
    it("parses ISO 8601 strings", () => {
      expect(parseDate("2024-06-15T14:05:07.123Z")?.toISOString()).toBe(
        "2024-06-15T14:05:07.123Z",
      );
    });
  });

  describe("explicit format option", () => {
    it("parses with MM/DD/YYYY", () => {
      const d = parseDate("06/15/2024", { format: "MM/DD/YYYY" });
      expect(d?.getUTCFullYear()).toBe(2024);
      expect(d?.getUTCMonth()).toBe(5);
      expect(d?.getUTCDate()).toBe(15);
    });

    it("falls through when explicit format does not match", () => {
      const d = parseDate("2024-06-15", { format: "MM/DD/YYYY" });
      expect(d?.toISOString().startsWith("2024-06-15")).toBe(true);
    });

    it("parses 12-hour with A", () => {
      const d = parseDate("06/15/2024 2:05 PM", {
        format: "MM/DD/YYYY h:mm A",
      });
      expect(d?.getUTCHours()).toBe(14);
    });
  });

  describe("normalized fallback (no native parse)", () => {
    it("parses dash-separated datetime without T or Z for Date.parse", () => {
      const d = parseDate("2024-06-15-14-05-07");
      expect(d?.toISOString()).toBe("2024-06-15T14:05:07.000Z");
    });

    it("parses MMM-DD-YYYY with explicit format", () => {
      const d = parseDate("Jun-15-2024", { format: "MMM-DD-YYYY" });
      expect(d?.getUTCMonth()).toBe(5);
      expect(d?.getUTCDate()).toBe(15);
    });

    it("parses MMMM-DD-YYYY with explicit format", () => {
      const d = parseDate("June-15-2024", { format: "MMMM-DD-YYYY" });
      expect(d?.getUTCMonth()).toBe(5);
      expect(d?.getUTCDate()).toBe(15);
    });

    it("parses DD-MM-YYYY when native parse fails", () => {
      const d = parseDate("15-06-2024");
      expect(d?.getUTCMonth()).toBe(5);
      expect(d?.getUTCDate()).toBe(15);
    });
  });

  describe("edge cases", () => {
    it("returns undefined for empty and invalid strings", () => {
      expect(parseDate("")).toBeUndefined();
      expect(parseDate("   ")).toBeUndefined();
      expect(parseDate("not-a-date-string")).toBeUndefined();
    });
  });

  describe("explicit format edge tokens", () => {
    it("parses YY and expands century", () => {
      const d = parseDate("06/15/24", { format: "MM/DD/YY" });
      expect(d?.getUTCFullYear()).toBe(2024);
    });

    it("parses Z as UTC offset in ISO-like string", () => {
      const d = parseDate("2024-06-15T14:05:07+00:00", {
        format: "YYYY-MM-DDTHH:mm:ssZ",
      });
      expect(d?.toISOString()).toBe("2024-06-15T14:05:07.000Z");
    });

    it("parses GMT in Z token", () => {
      const d = parseDate("2024-06-15 14:05:07 GMT", {
        format: "YYYY-MM-DD HH:mm:ss Z",
      });
      expect(d?.toISOString()).toBe("2024-06-15T14:05:07.000Z");
    });
  });
});
