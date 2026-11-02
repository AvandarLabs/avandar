import { formatFileSize } from "@utils/numbers/formatFileSize/formatFileSize.ts";
import { describe, expect, it } from "vitest";

describe("formatFileSize", () => {
  it("reports whole bytes without a fraction", () => {
    expect(formatFileSize(512, { locale: "en-US" })).toBe("512 B");
  });

  it("steps up a unit once the count reaches 1024", () => {
    expect(formatFileSize(1024, { locale: "en-US" })).toBe("1 KB");
  });

  it("keeps one decimal place above bytes", () => {
    expect(formatFileSize(1536, { locale: "en-US" })).toBe("1.5 KB");
  });

  it("stops at the largest unit it knows rather than inventing one", () => {
    const petabyte = 1024 ** 5;
    expect(formatFileSize(petabyte, { locale: "en-US" })).toBe("1,024 TB");
  });

  it("formats the decimal separator for the given locale", () => {
    expect(formatFileSize(1536, { locale: "de-DE" })).toBe("1,5 KB");
  });

  it("reports an empty file as zero bytes", () => {
    expect(formatFileSize(0, { locale: "en-US" })).toBe("0 B");
  });
});
