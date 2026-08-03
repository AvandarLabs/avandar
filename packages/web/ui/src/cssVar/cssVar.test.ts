import {
  cssAvaVar,
  cssVar,
  mantineColorVar,
  mantineVar,
} from "@ui/cssVar/cssVar";
import { describe, expect, it } from "vitest";

describe("cssVar", () => {
  it("wraps a raw custom property name in var()", () => {
    expect(cssVar("mantine-primary-color-6")).toBe(
      "var(--mantine-primary-color-6)",
    );
  });
});

describe("mantineColorVar", () => {
  it("defaults to shade 6 when no shade is given", () => {
    expect(mantineColorVar("neutral")).toBe("var(--mantine-color-neutral-6)");
  });

  it("uses the shade after a dot separator", () => {
    expect(mantineColorVar("primary.8")).toBe("var(--mantine-color-primary-8)");
  });
});

describe("mantineVar", () => {
  it("prefixes the name with --mantine-", () => {
    expect(mantineVar("shadow-lg")).toBe("var(--mantine-shadow-lg)");
  });
});

describe("cssAvaVar", () => {
  it("prefixes the name with --ava-", () => {
    expect(cssAvaVar("border-default")).toBe("var(--ava-border-default)");
  });
});
