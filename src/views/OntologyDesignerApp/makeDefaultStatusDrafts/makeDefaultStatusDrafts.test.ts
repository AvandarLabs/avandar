import { describe, expect, it } from "vitest";
import { makeDefaultStatusDrafts } from "./makeDefaultStatusDrafts";

describe("makeDefaultStatusDrafts", () => {
  it("starts with Active as the default, then Inactive", () => {
    const { statuses, defaultStatusId } = makeDefaultStatusDrafts();

    expect(
      statuses.map((status) => {
        return [status.name, status.color];
      }),
    ).toEqual([
      ["Active", "#40c057"],
      ["Inactive", "#637c95"],
    ]);
    expect(defaultStatusId).toBe(statuses[0]?.id);
  });

  it("describes each status for the people working the records", () => {
    const { statuses } = makeDefaultStatusDrafts();

    expect(
      statuses.map((status) => {
        return status.description;
      }),
    ).toEqual(["Open and being worked on.", "No longer being worked on."]);
  });

  it("gives every new case type its own status ids", () => {
    const first = makeDefaultStatusDrafts();
    const second = makeDefaultStatusDrafts();

    expect(second.defaultStatusId).not.toBe(first.defaultStatusId);
  });
});
