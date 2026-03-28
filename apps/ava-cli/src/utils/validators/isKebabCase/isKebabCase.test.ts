import { describe, expect, it } from "vitest";
import { isKebabCase } from "@ava-cli/utils/validators/isKebabCase/isKebabCase";

describe("isKebabCase", () => {
  it("returns a validator function", () => {
    const validator = isKebabCase();

    expect(typeof validator).toBe("function");
  });

  it("returns true for valid kebab-case values", () => {
    const validator = isKebabCase();

    expect(validator("a")).toBe(true);
    expect(validator("abc")).toBe(true);
    expect(validator("a-b")).toBe(true);
    expect(validator("a1")).toBe(true);
    expect(validator("a1-b2")).toBe(true);
    expect(validator("a-b-c")).toBe(true);
    expect(validator("my-package")).toBe(true);
  });

  it("returns the default error message for invalid values", () => {
    const validator = isKebabCase();

    expect(validator("")).toBe("Value must be kebab-case.");
    expect(validator("-a")).toBe("Value must be kebab-case.");
    expect(validator("A")).toBe("Value must be kebab-case.");
    expect(validator("aB")).toBe("Value must be kebab-case.");
    expect(validator("1a")).toBe("Value must be kebab-case.");
    expect(validator("a_b")).toBe("Value must be kebab-case.");
    expect(validator("a b")).toBe("Value must be kebab-case.");
  });

  it("returns the custom error message for invalid values", () => {
    const errorMessage = "Custom error message.";
    const validator = isKebabCase(errorMessage);

    expect(validator("Not-Kebab")).toBe(errorMessage);
  });

  it("still returns true for valid values with a custom message", () => {
    const validator = isKebabCase("Custom error message.");

    expect(validator("abc-def")).toBe(true);
  });
});
