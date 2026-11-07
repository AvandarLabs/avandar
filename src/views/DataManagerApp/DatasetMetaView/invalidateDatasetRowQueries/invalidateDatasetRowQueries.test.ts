import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { ConceptRecordValuesClient } from "@/clients/ontology/ConceptRecordValuesClient/ConceptRecordValuesClient";
import { invalidateDatasetRowQueries } from "@/views/DataManagerApp/DatasetMetaView/invalidateDatasetRowQueries/invalidateDatasetRowQueries";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { Workspace } from "$/models/Workspace/Workspace";

describe("invalidateDatasetRowQueries", () => {
  // A record's field values are computed from dataset rows, so a refresh that
  // changed the rows changes what a record page shows.
  it("marks every case type's record values stale", async () => {
    const queryClient = new QueryClient();
    const recordValuesKey =
      ConceptRecordValuesClient.QueryKeys.getConceptRecordValues({
        workspaceId: "eeeeeeee-5555-4555-8555-eeeeeeeeeeee" as Workspace.Id,
        conceptId: "cccccccc-3333-4333-8333-cccccccccccc" as Concept.Id,
        externalIds: ["p1"],
      });
    queryClient.setQueryData(recordValuesKey, []);

    await invalidateDatasetRowQueries(queryClient);

    expect(queryClient.getQueryState(recordValuesKey)?.isInvalidated).toBe(
      true,
    );
  });
});
