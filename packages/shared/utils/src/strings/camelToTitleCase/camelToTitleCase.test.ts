import { camelToTitleCase } from "@utils/strings/camelToTitleCase/camelToTitleCase.ts";
import { describe, expect, it } from "vitest";

describe("camelToTitleCase", () => {
  it("splits a camelCase word and capitalizes the first letter", () => {
    expect(camelToTitleCase("firstName")).toBe("First Name");
  });

  it("splits every boundary in a multi-word camelCase string", () => {
    expect(camelToTitleCase("userAccountSettings")).toBe(
      "User Account Settings",
    );
  });

  it("keeps consecutive capitals together as an acronym", () => {
    expect(camelToTitleCase("parseURL")).toBe("Parse URL");
  });

  it("splits an acronym from the word that follows it", () => {
    expect(camelToTitleCase("parseURLString")).toBe("Parse URL String");
  });

  it("leaves the first letter alone when capitalizeFirstLetter is false", () => {
    expect(
      camelToTitleCase("firstName", { capitalizeFirstLetter: false }),
    ).toBe("first Name");
  });

  it("capitalizes a single lowercase word", () => {
    expect(camelToTitleCase("name")).toBe("Name");
  });

  it("leaves an already-capitalized single word unchanged", () => {
    expect(camelToTitleCase("Name")).toBe("Name");
  });

  it("handles empty strings", () => {
    expect(camelToTitleCase("")).toBe("");
  });
});
