import { describe, expect, it } from "vitest";
import { NavbarLinks } from "@/config/NavbarLinks/NavbarLinks";

describe("NavbarLinks map destination", () => {
  it("does not add a feature-flag gate to the map permission gate", () => {
    expect(NavbarLinks.map("workspace-slug")).not.toHaveProperty("isEnabled");
  });
});
