import { describe, expect, it, vi } from "vitest";
import { notifyRelationFetched } from "@/clients/qetl/QueryMediator/notifyRelationFetched/notifyRelationFetched";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const DATASET_ID = "22222222-2222-4222-8222-222222222222" as Dataset.Id;

describe("notifyRelationFetched", () => {
  it("calls the listener with the dataset", () => {
    const listener = vi.fn();

    notifyRelationFetched(listener, DATASET_ID);

    expect(listener).toHaveBeenCalledExactlyOnceWith(DATASET_ID);
  });

  it("does nothing without a listener", () => {
    expect(() => {
      notifyRelationFetched(undefined, DATASET_ID);
    }).not.toThrow();
  });

  it("swallows a listener that throws", () => {
    const listener = vi.fn(() => {
      throw new Error("listener failed");
    });

    expect(() => {
      notifyRelationFetched(listener, DATASET_ID);
    }).not.toThrow();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
