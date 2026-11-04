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

describe("ConceptStatus.findSetIssues", () => {
  it("reports an empty set and nothing else", () => {
    expect(
      ConceptStatus.findSetIssues({
        value: { statuses: [], defaultStatusId: undefined },
      }),
    ).toEqual([{ type: "empty_set" }]);
  });

  it("flags a blank name on its own row", () => {
    const blank = _makeDraft("   ");

    expect(
      ConceptStatus.findSetIssues({
        value: { statuses: [blank], defaultStatusId: blank.id },
      }),
    ).toEqual([{ type: "name_required", statusId: blank.id }]);
  });

  it("flags both rows when two names differ only in case and spacing", () => {
    const active = _makeDraft("Active");
    const duplicate = _makeDraft(" active ");

    expect(
      ConceptStatus.findSetIssues({
        value: { statuses: [active, duplicate], defaultStatusId: active.id },
      }),
    ).toEqual([
      { type: "name_not_unique", statusId: active.id },
      { type: "name_not_unique", statusId: duplicate.id },
    ]);
  });

  it("requires a default that is in the set", () => {
    const active = _makeDraft("Active");

    expect(
      ConceptStatus.findSetIssues({
        value: {
          statuses: [active],
          defaultStatusId: uuid<ConceptStatus.Id>(),
        },
      }),
    ).toEqual([{ type: "default_required" }]);
  });

  it("requires a replacement for a removed status that still has records", () => {
    const kept = _makeDraft("Kept");
    const removedId = uuid<ConceptStatus.Id>();

    expect(
      ConceptStatus.findSetIssues({
        value: { statuses: [kept], defaultStatusId: kept.id },
        savedStatusIds: [kept.id, removedId],
        recordCounts: { [removedId]: 3 },
        replacements: {},
      }),
    ).toEqual([{ type: "replacement_required", statusId: removedId }]);
  });

  it("does not require a replacement for a removed status with no records", () => {
    const kept = _makeDraft("Kept");
    const removedId = uuid<ConceptStatus.Id>();

    expect(
      ConceptStatus.findSetIssues({
        value: { statuses: [kept], defaultStatusId: kept.id },
        savedStatusIds: [kept.id, removedId],
        recordCounts: { [removedId]: 0 },
      }),
    ).toEqual([]);
  });

  it("rejects a replacement that is itself being removed", () => {
    const kept = _makeDraft("Kept");
    const removedId = uuid<ConceptStatus.Id>();
    const alsoRemovedId = uuid<ConceptStatus.Id>();

    expect(
      ConceptStatus.findSetIssues({
        value: { statuses: [kept], defaultStatusId: kept.id },
        savedStatusIds: [kept.id, removedId, alsoRemovedId],
        recordCounts: { [removedId]: 2 },
        replacements: { [removedId]: alsoRemovedId },
      }),
    ).toEqual([{ type: "replacement_required", statusId: removedId }]);
  });
});

describe("ConceptStatus.buildSavePayload", () => {
  it("numbers positions by order, trims names, and drops blank descriptions", () => {
    const closed = { ..._makeDraft(" Closed "), description: "  " };
    const active = { ..._makeDraft("Active"), description: "Open." };

    const payload = ConceptStatus.buildSavePayload({
      conceptId: CONCEPT_ID,
      value: { statuses: [closed, active], defaultStatusId: active.id },
      savedStatusIds: [],
      replacements: {},
    });

    expect(payload.statuses).toEqual([
      {
        id: closed.id,
        name: "Closed",
        description: undefined,
        color: "#637c95",
        position: 0,
      },
      {
        id: active.id,
        name: "Active",
        description: "Open.",
        color: "#637c95",
        position: 1,
      },
    ]);
    expect(payload.defaultStatusId).toBe(active.id);
  });

  it("keeps replacements only for statuses that are being removed", () => {
    const kept = _makeDraft("Kept");
    const other = _makeDraft("Other");
    const removedId = uuid<ConceptStatus.Id>();

    const payload = ConceptStatus.buildSavePayload({
      conceptId: CONCEPT_ID,
      value: { statuses: [kept, other], defaultStatusId: kept.id },
      savedStatusIds: [kept.id, other.id, removedId],
      replacements: { [removedId]: kept.id, [other.id]: kept.id },
    });

    expect(payload.replacements).toEqual({ [removedId]: kept.id });
  });

  it("throws when the set has no default status", () => {
    expect(() => {
      return ConceptStatus.buildSavePayload({
        conceptId: CONCEPT_ID,
        value: { statuses: [_makeDraft("Active")], defaultStatusId: undefined },
        savedStatusIds: [],
        replacements: {},
      });
    }).toThrow();
  });
});

describe("ConceptStatus.toSaveErrorHint", () => {
  it("reads a known hint off a thrown database error", () => {
    expect(
      ConceptStatus.toSaveErrorHint({
        code: "23514",
        message: "Records still use a removed status. Choose where they move.",
        hint: "status_replacement_required",
      }),
    ).toBe("status_replacement_required");
  });

  it("ignores a hint the save RPC does not raise", () => {
    expect(
      ConceptStatus.toSaveErrorHint({ hint: "something_else" }),
    ).toBeUndefined();
  });

  it("ignores a thrown value that is not an object", () => {
    expect(ConceptStatus.toSaveErrorHint("boom")).toBeUndefined();
  });
});
