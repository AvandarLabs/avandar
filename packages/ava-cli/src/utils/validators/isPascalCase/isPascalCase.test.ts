import { describe, expect, it } from "vitest";
import { isPascalCase } from "./isPascalCase";

describe("isPascalCase", () => {
  it("returns a validator function", () => {
    const validator = isPascalCase();

    expect(typeof validator).toBe("function");
  });

  it("returns true for valid PascalCase values", () => {
    const validator = isPascalCase();

    expect(validator("A")).toBe(true);
    expect(validator("ABC")).toBe(true);
    expect(validator("Abc")).toBe(true);
    expect(validator("AbcDef")).toBe(true);
    expect(validator("Abc123")).toBe(true);
    expect(validator("Abc1Def2")).toBe(true);
  });

  it("returns the default error message for invalid values", () => {
    const validator = isPascalCase();

    expect(validator("")).toBe("Value must be PascalCase.");
    expect(validator("a")).toBe("Value must be PascalCase.");
    expect(validator("abc")).toBe("Value must be PascalCase.");
    expect(validator("aBc")).toBe("Value must be PascalCase.");
    expect(validator("Abc_Def")).toBe("Value must be PascalCase.");
    expect(validator("Abc-Def")).toBe("Value must be PascalCase.");
    expect(validator("Abc Def")).toBe("Value must be PascalCase.");
  });

  it("returns the custom error message for invalid values", () => {
    const errorMessage = "Custom error message.";
    const validator = isPascalCase(errorMessage);

    expect(validator("notPascalCase")).toBe(errorMessage);
  });

  it("still returns true for valid values with a custom message", () => {
    const validator = isPascalCase("Custom error message.");

    expect(validator("PascalCase")).toBe(true);
  });
});
