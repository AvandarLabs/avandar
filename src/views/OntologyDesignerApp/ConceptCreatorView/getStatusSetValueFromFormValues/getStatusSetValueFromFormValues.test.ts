import { describe, expect, it } from "vitest";
import { getStatusSetValueFromFormValues } from "@/views/OntologyDesignerApp/ConceptCreatorView/getStatusSetValueFromFormValues/getStatusSetValueFromFormValues";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";

const ACTIVE: ConceptStatus.Draft = {
  id: "00000000-0000-4000-8000-0000000000a1" as ConceptStatus.Id,
  name: "Active",
  description: "",
  color: "#40c057",
};
const REMOVED_STATUS_ID =
  "00000000-0000-4000-8000-0000000000a9" as ConceptStatus.Id;

describe("getStatusSetValueFromFormValues", () => {
  it("keeps the default when it names one of the statuses", () => {
    expect(
      getStatusSetValueFromFormValues({
        statuses: [ACTIVE],
        defaultStatusId: ACTIVE.id,
      }),
    ).toEqual({ statuses: [ACTIVE], defaultStatusId: ACTIVE.id });
  });

  it("drops a default that no longer names any status", () => {
    expect(
      getStatusSetValueFromFormValues({
        statuses: [ACTIVE],
        defaultStatusId: REMOVED_STATUS_ID,
      }).defaultStatusId,
    ).toBeUndefined();
  });
});
