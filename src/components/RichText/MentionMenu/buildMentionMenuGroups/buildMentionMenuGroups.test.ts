import { describe, expect, it } from "vitest";
import { buildMentionMenuGroups } from "@/components/RichText/MentionMenu/buildMentionMenuGroups/buildMentionMenuGroups";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { GadgetSearchResult } from "@/clients/gadgets/searchGadgets/searchGadgets";

function _gadget(gadgetType: Gadget.Type, label: string): GadgetSearchResult {
  return {
    ref: {
      gadgetType,
      gadgetId: "11111111-1111-4111-8111-111111111111",
      subId: gadgetType === "dashboard_tile" ? "DataViz-1" : null,
    },
    label,
    subLabel: undefined,
    hasLimitedAudience: false,
  };
}

describe("buildMentionMenuGroups", () => {
  it("groups gadgets by type in menu order, people last, at most 5 each, hiding empty groups", () => {
    const groups = buildMentionMenuGroups({
      gadgets: [
        _gadget("individual", "Amara"),
        _gadget("dashboard_tile", "Cases per week"),
        _gadget("dashboard", "Measles"),
        ...Array.from({ length: 7 }, (_, index) => {
          return _gadget("dataset", `Dataset ${index}`);
        }),
      ],
      people: [{ userId: "u1", displayName: "Bella", email: "b@example.org" }],
    });
    expect(
      groups.map((group) => {
        return group.key;
      }),
    ).toEqual(["dashboards", "datasets", "cases", "people"]);
    expect(
      groups[0]?.items.map((item) => {
        return item.label;
      }),
    ).toEqual(["Measles", "Cases per week"]);
    expect(groups[1]?.items).toHaveLength(5);
  });

  it("shows a person's email and a gadget's sub-label as the detail line", () => {
    const groups = buildMentionMenuGroups({
      gadgets: [
        {
          ..._gadget("dashboard_tile", "Cases per week"),
          subLabel: "Measles by borough",
        },
      ],
      people: [{ userId: "u1", displayName: "Bella", email: "b@example.org" }],
    });
    expect(
      groups.flatMap((group) => {
        return group.items.map((item) => {
          return item.detail;
        });
      }),
    ).toEqual(["Measles by borough", "b@example.org"]);
  });

  it("gives every item a distinct option id, even two tiles of one dashboard", () => {
    const groups = buildMentionMenuGroups({
      gadgets: [
        _gadget("dashboard_tile", "Cases per week"),
        {
          ..._gadget("dashboard_tile", "Cases by age"),
          ref: { ..._gadget("dashboard_tile", "").ref, subId: "DataViz-2" },
        },
        _gadget("dashboard", "Measles"),
      ],
      people: [],
    });
    const ids = groups.flatMap((group) => {
      return group.items.map((item) => {
        return item.id;
      });
    });
    expect(new Set(ids).size).toBe(3);
  });

  it("shows at most five people", () => {
    const people = Array.from({ length: 8 }, (_, index) => {
      return {
        userId: String(index),
        displayName: `Person ${index}`,
        email: `p${index}@example.org`,
      };
    });
    const [peopleGroup] = buildMentionMenuGroups({ gadgets: [], people });
    expect(peopleGroup?.items).toHaveLength(5);
  });

  it("returns no groups when nothing matches", () => {
    expect(buildMentionMenuGroups({ gadgets: [], people: [] })).toEqual([]);
  });
});
