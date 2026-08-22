import { afterEach, describe, expect, it } from "vitest";
import { NuxStepFactsStore } from "@/components/Nux/NuxTour/NuxStepFactsStore/NuxStepFactsStore";
import { usePublishNuxGeneralAccessFact } from "@/components/Nux/NuxTour/usePublishNuxGeneralAccessFact/usePublishNuxGeneralAccessFact";
import { renderHook } from "@/test-utils";

describe("usePublishNuxGeneralAccessFact", () => {
  afterEach(() => {
    NuxStepFactsStore.setGeneralAccessIsWorkspace(false);
  });

  it("publishes workspace access for a dashboard even when that was the default", () => {
    renderHook(() => {
      usePublishNuxGeneralAccessFact({
        resourceType: "dashboard",
        displayedValue: "workspace",
      });
    });
    expect(NuxStepFactsStore.getGeneralAccessIsWorkspace()).toBe(true);
  });

  it("clears the fact when general access is not workspace", () => {
    NuxStepFactsStore.setGeneralAccessIsWorkspace(true);
    renderHook(() => {
      usePublishNuxGeneralAccessFact({
        resourceType: "dashboard",
        displayedValue: "restricted",
      });
    });
    expect(NuxStepFactsStore.getGeneralAccessIsWorkspace()).toBe(false);
  });

  it("does not publish workspace access for a dataset share modal", () => {
    renderHook(() => {
      usePublishNuxGeneralAccessFact({
        resourceType: "dataset",
        displayedValue: "workspace",
      });
    });
    expect(NuxStepFactsStore.getGeneralAccessIsWorkspace()).toBe(false);
  });

  it("clears the fact when the share modal unmounts", () => {
    const { unmount } = renderHook(() => {
      usePublishNuxGeneralAccessFact({
        resourceType: "dashboard",
        displayedValue: "workspace",
      });
    });
    unmount();
    expect(NuxStepFactsStore.getGeneralAccessIsWorkspace()).toBe(false);
  });
});
