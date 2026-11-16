import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, TestProviders } from "@/test-utils";
import { useCrosswalkErrorMessage } from "@/views/DataManagerApp/CrosswalkView/useCrosswalkErrorMessage/useCrosswalkErrorMessage";

const mocks = vi.hoisted(() => {
  return { isOnline: true };
});

vi.mock("@avandar/browser-utils", async (importOriginal) => {
  const original = await importOriginal<object>();
  return {
    ...original,
    getIsOnline: () => {
      return mocks.isOnline;
    },
  };
});

function _toMessage(error: unknown): string {
  return renderHook(
    () => {
      return useCrosswalkErrorMessage();
    },
    { wrapper: TestProviders },
  ).result.current(error);
}

describe("useCrosswalkErrorMessage", () => {
  beforeEach(() => {
    mocks.isOnline = true;
  });

  it("explains a save refusal from its hint", () => {
    expect(_toMessage({ hint: "crosswalk_name_required" })).toBe(
      "Give the crosswalk a name.",
    );
    expect(_toMessage({ hint: "column_names_not_unique" })).toContain(
      "source_dataset",
    );
  });

  it("explains a dataset the user can't open, whether it was sent or left behind", () => {
    expect(_toMessage({ hint: "dataset_not_readable" })).toBe(
      "This change involves a dataset you can't open, so nothing was saved. Ask for access to it, or reload the crosswalk to go back to what was last saved.",
    );
  });

  it("explains a combine refusal from its hint", () => {
    expect(_toMessage({ hint: "dataset_creator_required" })).toBe(
      "Only workspace admins can add datasets.",
    );
  });

  it("explains a crosswalk that would include its own combined dataset", () => {
    expect(_toMessage({ hint: "output_dataset_in_crosswalk" })).toBe(
      "This crosswalk would include its own combined dataset. Remove it from the datasets and try again.",
    );
  });

  it("explains a combine blocked by a dataset the user can't open", () => {
    expect(_toMessage({ hint: "crosswalk_has_unreadable_datasets" })).toBe(
      "This crosswalk includes a dataset you can't open, so it can't be updated by you.",
    );
  });

  it("says nothing was saved for an unknown error", () => {
    expect(_toMessage(new Error("boom"))).toBe(
      "Nothing was saved. Please try again.",
    );
  });

  it("says the user is offline before anything else", () => {
    mocks.isOnline = false;
    expect(_toMessage({ hint: "crosswalk_name_required" })).toBe(
      "You're offline. Reconnect to save this.",
    );
  });
});
