import { describe, expect, it } from "vitest";
import { doesVanitySlugChangeInvalidatePreviousUrl } from "./doesVanitySlugChangeInvalidatePreviousUrl";

describe("doesVanitySlugChangeInvalidatePreviousUrl", () => {
  it("is false when setting a vanity slug for the first time", () => {
    expect(
      doesVanitySlugChangeInvalidatePreviousUrl({
        previousSlug: "",
        nextSlug: "first-dash",
      }),
    ).toBe(false);
  });

  it("is true when replacing one vanity slug with another", () => {
    expect(
      doesVanitySlugChangeInvalidatePreviousUrl({
        previousSlug: "first-dash",
        nextSlug: "second-dash",
      }),
    ).toBe(true);
  });

  it("is false when the vanity slug is unchanged", () => {
    expect(
      doesVanitySlugChangeInvalidatePreviousUrl({
        previousSlug: "first-dash",
        nextSlug: "First Dash",
      }),
    ).toBe(false);
  });
});
