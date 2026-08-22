import { afterEach, describe, expect, it } from "vitest";

import { NuxStepFactsStore } from "@/components/Nux/NuxTour/NuxStepFactsStore/NuxStepFactsStore";

describe("NuxStepFactsStore", () => {
  afterEach(() => {
    NuxStepFactsStore.setExplorerHasQueryResults(false);
    NuxStepFactsStore.setGeneralAccessIsWorkspace(false);
  });

  it("starts with no explorer query results and no workspace access pick", () => {
    expect(NuxStepFactsStore.getFacts()).toEqual({
      explorerHasQueryResults: false,
      generalAccessIsWorkspace: false,
    });
  });

  it("records whether the explorer has savable query results", () => {
    NuxStepFactsStore.setExplorerHasQueryResults(true);
    expect(NuxStepFactsStore.getFacts()).toEqual({
      explorerHasQueryResults: true,
      generalAccessIsWorkspace: false,
    });
  });

  it("records whether general access is workspace", () => {
    NuxStepFactsStore.setGeneralAccessIsWorkspace(true);
    expect(NuxStepFactsStore.getFacts()).toEqual({
      explorerHasQueryResults: false,
      generalAccessIsWorkspace: true,
    });
  });
});
