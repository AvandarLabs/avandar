import { Model } from "@avandar/models";
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid.ts";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus.ts";
import type { Concept } from "$/models/ontology/Concept/Concept.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

const CONCEPT_ID = uuid<Concept.Id>();
const WORKSPACE_ID = uuid<Workspace.Id>();

function _makeSavedStatus(options: {
  name: string;
  position: number;
  description?: string;
}): ConceptStatus.T {
  return Model.make("ConceptStatus", {
    id: uuid<ConceptStatus.Id>(),
    workspaceId: WORKSPACE_ID,
    conceptId: CONCEPT_ID,
    name: options.name,
    description: options.description,
    color: "#637c95",
    position: options.position,
    createdAt: "2026-10-25T00:00:00.000Z",
    updatedAt: "2026-10-25T00:00:00.000Z",
  });
}

function _makeDraft(name: string): ConceptStatus.Draft {
  return {
    id: uuid<ConceptStatus.Id>(),
    name,
    description: "",
    color: "#637c95",
  };
}

describe("ConceptStatus.getNextFreeColor", () => {
  it("returns the first palette color the set does not use", () => {
    expect(ConceptStatus.getNextFreeColor(["#637c95", "#40c057"])).toBe(
      "#228be6",
    );
  });

  it("matches used colors regardless of case", () => {
    expect(ConceptStatus.getNextFreeColor(["#637C95"])).toBe("#40c057");
  });

  it("wraps around the palette once every color is used", () => {
    const allColors = ConceptStatus.PALETTE.map((entry) => {
      return entry.hex;
    });

    expect(ConceptStatus.getNextFreeColor(allColors)).toBe("#637c95");
  });
});

describe("ConceptStatus.getColorKey", () => {
  it("names the palette swatch of a hex color, ignoring case", () => {
    expect(ConceptStatus.getColorKey("#40C057")).toBe("green");
  });

  it("returns undefined for a color outside the palette", () => {
    expect(ConceptStatus.getColorKey("#123456")).toBeUndefined();
  });
});

describe("ConceptStatus.sortByPosition", () => {
  it("orders by position and breaks ties by name", () => {
    const sorted = ConceptStatus.sortByPosition([
      { position: 1, name: "B" },
      { position: 0, name: "Z" },
      { position: 1, name: "A" },
    ]);

    expect(
      sorted.map((status) => {
        return status.name;
      }),
    ).toEqual(["Z", "A", "B"]);
  });
});

describe("ConceptStatus.toDrafts", () => {
  it("returns saved statuses as drafts in position order with blank descriptions", () => {
    const inactive = _makeSavedStatus({ name: "Inactive", position: 1 });
    const active = _makeSavedStatus({
      name: "Active",
      position: 0,
      description: "Open.",
    });

    expect(ConceptStatus.toDrafts([inactive, active])).toEqual([
      {
        id: active.id,
        name: "Active",
        description: "Open.",
        color: "#637c95",
      },
      { id: inactive.id, name: "Inactive", description: "", color: "#637c95" },
    ]);
  });
});

describe("ConceptStatus.getRemovedStatusIds", () => {
  it("lists saved statuses that are no longer in the set", () => {
    const kept = _makeDraft("Kept");
    const removed = _makeDraft("Removed");

    expect(
      ConceptStatus.getRemovedStatusIds({
        savedStatusIds: [kept.id, removed.id],
        statuses: [kept, _makeDraft("New")],
      }),
    ).toEqual([removed.id]);
  });
});

describe("ConceptStatus.isReservedAttributeName", () => {
  it("reserves status in any case and spacing", () => {
    expect(ConceptStatus.isReservedAttributeName(" Status ")).toBe(true);
    expect(ConceptStatus.isReservedAttributeName("STATUS")).toBe(true);
  });

  it("allows names that only contain the word status", () => {
    expect(ConceptStatus.isReservedAttributeName("Status (attribute)")).toBe(
      false,
    );
    expect(ConceptStatus.isReservedAttributeName("statuses")).toBe(false);
  });
});

describe("ConceptStatus.toNonReservedAttributeName", () => {
  it("renames a reserved name the way the backfill migration does", () => {
    expect(ConceptStatus.toNonReservedAttributeName(" Status ")).toBe(
      "Status (attribute)",
    );
  });

  it("leaves any other name unchanged", () => {
    expect(ConceptStatus.toNonReservedAttributeName("Region")).toBe("Region");
  });
});
