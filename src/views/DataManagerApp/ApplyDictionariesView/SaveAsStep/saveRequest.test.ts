import { describe, expect, it } from "vitest";
import {
  GENDER,
  LINKED_ONLY_TARGETS,
  makeApplyFlow,
  SEX_PICK,
} from "@/views/DataManagerApp/ApplyDictionariesView/__tests__/applyFlow.fixtures";
import {
  buildSaveRequest,
  getSaveBlocker,
  getWhatHappens,
} from "@/views/DataManagerApp/ApplyDictionariesView/SaveAsStep/saveRequest";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";

const STATE = makeApplyFlow().state;
const UNMATCHED = { status: "ready", result: new Map() } as const;

describe("saveRequest", () => {
  it("creates a linked dataset with live conversions", () => {
    const request = buildSaveRequest({
      state: STATE,
      columns: [GENDER],
      unmatched: UNMATCHED,
      isLinkedDataset: false,
      linkedDatasetName: "Bronx (labeled)",
    });

    expect(request).toMatchObject({
      kind: "linked",
      linkedDatasetName: "Bronx (labeled)",
    });
    expect(request?.bindings[0]).toMatchObject({
      mode: "convert",
      isPinned: false,
    });
  });

  it("pins the conversions when the dataset changes in place", () => {
    const request = buildSaveRequest({
      state: { ...STATE, saveTarget: "in_place" },
      columns: [GENDER],
      unmatched: UNMATCHED,
      isLinkedDataset: false,
      linkedDatasetName: "",
    });

    expect(request?.kind).toBe("in_place");
    expect(request?.bindings[0]?.isPinned).toBe(true);
  });

  it("updates a linked dataset's own conversions without a target", () => {
    const request = buildSaveRequest({
      state: { ...STATE, saveTarget: undefined },
      columns: [GENDER],
      unmatched: UNMATCHED,
      isLinkedDataset: true,
      linkedDatasetName: "",
    });

    expect(request?.kind).toBe("update_linked");
    expect(request?.bindings[0]?.isPinned).toBe(false);
  });

  it("blocks saving without a target, a name, or the synced-change confirmation", () => {
    const base = {
      targets: LINKED_ONLY_TARGETS,
      hasConfirmedWorkspaceChange: false,
    };
    const linked = buildSaveRequest({
      state: STATE,
      columns: [GENDER],
      unmatched: UNMATCHED,
      isLinkedDataset: false,
      linkedDatasetName: " ",
    });

    expect(getSaveBlocker({ ...base, request: undefined })).toBe("no_target");
    expect(getSaveBlocker({ ...base, request: linked })).toBe("no_name");
    expect(
      getSaveBlocker({
        targets: {
          ...LINKED_ONLY_TARGETS,
          inPlace: { isAvailable: true, storage: "synced" },
        },
        hasConfirmedWorkspaceChange: false,
        request: { kind: "in_place", bindings: [], addedPairs: [] },
      }),
    ).toBe("needs_confirmation");
  });

  it("says what happens to each column, including one going back to its values", () => {
    const converted = { mode: "convert" } as DictionaryBinding.T;

    expect(getWhatHappens({ pick: SEX_PICK, existing: undefined })).toEqual({
      kind: "decode",
      restoresSource: false,
    });
    expect(
      getWhatHappens({
        pick: { ...SEX_PICK, mode: "reference" },
        existing: converted,
      }),
    ).toEqual({ kind: "restored" });
    expect(
      getWhatHappens({
        pick: { ...SEX_PICK, codeListId: undefined },
        existing: undefined,
      }),
    ).toEqual({ kind: "described" });
    expect(getWhatHappens({ pick: undefined, existing: converted })).toEqual({
      kind: "removed",
      restoresValues: true,
    });
  });
});
