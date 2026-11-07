import { describe, expect, it } from "vitest";
import { GADGET_TYPES } from "$/models/gadgets/Gadget/Gadget";
import { GADGET_REGISTRY } from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";
import { i18n } from "@/i18n/i18n";

describe("GADGET_REGISTRY", () => {
  it("gives every gadget type a distinct noun", () => {
    const nouns = GADGET_TYPES.map((gadgetType) => {
      return i18n._(GADGET_REGISTRY[gadgetType].noun);
    });
    expect(nouns).toEqual([
      "dashboard",
      "tile",
      "dataset",
      "map",
      "case type",
      "case",
    ]);
  });

  it("gives every gadget type a distinct icon", () => {
    const icons = GADGET_TYPES.map((gadgetType) => {
      return GADGET_REGISTRY[gadgetType].Icon;
    });
    expect(new Set(icons).size).toBe(GADGET_TYPES.length);
  });
});
