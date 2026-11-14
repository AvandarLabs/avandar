import { describe, expect, it } from "vitest";
import { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk.ts";

describe("Crosswalk.toSaveErrorHint", () => {
  it.each([
    "crosswalk_editor_required",
    "column_names_not_unique",
    "reference_layout_required",
    "dataset_not_readable",
    "fill_invalid",
    "output_dataset_in_crosswalk",
  ] as const)("reads the save hint %s", (hint) => {
    expect(Crosswalk.toSaveErrorHint({ hint })).toBe(hint);
  });

  it("ignores a hint only the combined-dataset RPC sends", () => {
    expect(
      Crosswalk.toSaveErrorHint({ hint: "combined_dataset_mismatch" }),
    ).toBeUndefined();
  });

  it("ignores an error with no hint", () => {
    expect(Crosswalk.toSaveErrorHint(new Error("offline"))).toBeUndefined();
  });
});

describe("Crosswalk.toCombineErrorHint", () => {
  it.each([
    "crosswalk_editor_required",
    "combined_columns_invalid",
    "binding_not_in_workspace",
    "dataset_creator_required",
    "dataset_editor_required",
    "crosswalk_has_unreadable_datasets",
  ] as const)("reads the combine hint %s", (hint) => {
    expect(Crosswalk.toCombineErrorHint({ hint })).toBe(hint);
  });

  it("ignores a hint only the save RPC sends", () => {
    expect(
      Crosswalk.toCombineErrorHint({ hint: "fill_invalid" }),
    ).toBeUndefined();
  });
});
