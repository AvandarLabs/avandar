import { describe, expect, it } from "vitest";
import { GADGET_TYPES } from "$/models/gadgets/Gadget/Gadget";
import { GADGET_REGISTRY } from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";
import { i18n } from "@/i18n/i18n";

function _translateEach(
  key:
    | "label"
    | "openLabel"
    | "loadingLabel"
    | "unavailableLabel"
    | "limitedAudienceHint",
): string[] {
  return GADGET_TYPES.map((gadgetType) => {
    return i18n._(GADGET_REGISTRY[gadgetType][key]);
  });
}

describe("GADGET_REGISTRY", () => {
  it("names each gadget type in the order the @ menu lists them", () => {
    expect(_translateEach("label")).toEqual([
      "Dashboard",
      "Dashboard tile",
      "Dataset",
      "Map",
      "Case type",
      "Case",
    ]);
  });

  it("phrases each type's unavailable state as one whole message", () => {
    expect(_translateEach("unavailableLabel")).toEqual([
      "Unavailable dashboard",
      "Unavailable dashboard tile",
      "Unavailable dataset",
      "Unavailable map",
      "Unavailable case type",
      "Unavailable case",
    ]);
  });

  it("phrases each type's open action as one whole message", () => {
    expect(_translateEach("openLabel")).toEqual([
      "Open dashboard",
      "Open dashboard tile",
      "Open dataset",
      "Open map",
      "Open case type",
      "Open case",
    ]);
  });

  it("phrases each type's loading state as one whole message", () => {
    expect(_translateEach("loadingLabel")).toEqual([
      "Loading dashboard",
      "Loading dashboard tile",
      "Loading dataset",
      "Loading map",
      "Loading case type",
      "Loading case",
    ]);
  });

  it("names the gadget's own type in each limited audience hint", () => {
    expect(_translateEach("limitedAudienceHint")[2]).toBe(
      'Only some people can open this dataset. Teammates on this case without access will see "Unavailable".',
    );
    expect(new Set(_translateEach("limitedAudienceHint")).size).toBe(
      GADGET_TYPES.length,
    );
  });

  it("gives every gadget type a distinct icon", () => {
    const icons = GADGET_TYPES.map((gadgetType) => {
      return GADGET_REGISTRY[gadgetType].Icon;
    });
    expect(new Set(icons).size).toBe(GADGET_TYPES.length);
  });
});
