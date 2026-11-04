/**
 * Chat names its statuses and their default; the status set editor and the
 * create path need ids. These pin the conversion and its fallbacks.
 */
import { describe, expect, it } from "vitest";
import { makeStatusSetValueFromChatStatuses } from "@/views/OntologyDesignerApp/makeStatusSetValueFromChatStatuses/makeStatusSetValueFromChatStatuses";
import type { ChatCaseStatus } from "$/types/chat.types";

const WORKFLOW: ChatCaseStatus[] = [
  { name: "Suspected", description: "Reported, not tested.", color: "#fab005" },
  { name: "Confirmed", description: "Tested positive.", color: "#fa5252" },
];

describe("makeStatusSetValueFromChatStatuses", () => {
  it("keeps chat's statuses in order with their descriptions and colors", () => {
    const value = makeStatusSetValueFromChatStatuses({
      statuses: WORKFLOW,
      defaultStatusName: "Suspected",
    });

    expect(
      value.statuses.map(({ name, description, color }) => {
        return { name, description, color };
      }),
    ).toEqual(WORKFLOW);
  });

  it("makes the named status the default, matching its name in any case", () => {
    const value = makeStatusSetValueFromChatStatuses({
      statuses: WORKFLOW,
      defaultStatusName: " confirmed ",
    });

    expect(value.defaultStatusId).toBe(value.statuses[1]?.id);
  });

  it("makes the first status the default when the name matches none", () => {
    const value = makeStatusSetValueFromChatStatuses({
      statuses: WORKFLOW,
      defaultStatusName: "Closed",
    });

    expect(value.defaultStatusId).toBe(value.statuses[0]?.id);
  });

  it("gives every status its own id", () => {
    const value = makeStatusSetValueFromChatStatuses({
      statuses: WORKFLOW,
      defaultStatusName: undefined,
    });

    const ids = value.statuses.map((status) => {
      return status.id;
    });
    expect(new Set(ids).size).toBe(2);
  });

  it("falls back to the default set when chat proposed no statuses", () => {
    const value = makeStatusSetValueFromChatStatuses({});

    expect(
      value.statuses.map((status) => {
        return status.name;
      }),
    ).toEqual(["Active", "Inactive"]);
    expect(value.defaultStatusId).toBe(value.statuses[0]?.id);
  });
});
