import { describe, expect, it } from "vitest";
import { getDefaultConceptFormValues } from "./conceptFormTypes";

describe("getDefaultConceptFormValues", () => {
  it("starts a new case type with Active as its default status, then Inactive", () => {
    const formValues = getDefaultConceptFormValues();

    expect(
      formValues.statuses.map((status) => {
        return status.name;
      }),
    ).toEqual(["Active", "Inactive"]);
    expect(formValues.defaultStatusId).toBe(formValues.statuses[0]?.id);
  });
});
