import { describe, expect, it } from "vitest";
import { act, renderHook } from "@/test-utils";
import { useDataDictionaryDraft } from "@/views/DataManagerApp/DataDictionaryView/useDataDictionaryDraft/useDataDictionaryDraft";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";

function _draft(name: string): DataDictionary.Draft {
  return {
    codeLists: [],
    entries: [
      {
        id: "11111111-1111-4111-8111-111111111111" as DataDictionaryEntry.Id,
        name,
        columnNames: [],
        kind: "text",
        unit: "",
        validMin: undefined,
        validMax: undefined,
        description: "",
        codings: [],
      },
    ],
  };
}

describe("useDataDictionaryDraft", () => {
  it("is dirty after an edit and clean again after discard", () => {
    const { result } = renderHook(() => {
      return useDataDictionaryDraft(_draft("sex"));
    });
    act(() => {
      result.current.setDraft(_draft("gender"));
    });
    expect(result.current.isDirty).toBe(true);
    act(() => {
      result.current.discard();
    });
    expect(result.current.isDirty).toBe(false);
    expect(result.current.draft.entries[0]?.name).toBe("sex");
  });

  it("adopts a newer saved draft while clean, and keeps unsaved edits while dirty", () => {
    const { result, rerender } = renderHook(
      ({ savedDraft }) => {
        return useDataDictionaryDraft(savedDraft);
      },
      { initialProps: { savedDraft: _draft("sex") } },
    );
    rerender({ savedDraft: _draft("sex_at_birth") });
    expect(result.current.draft.entries[0]?.name).toBe("sex_at_birth");

    act(() => {
      result.current.setDraft(_draft("mine"));
    });
    rerender({ savedDraft: _draft("theirs") });
    expect(result.current.draft.entries[0]?.name).toBe("mine");
  });

  it("treats the just-saved draft as clean", () => {
    const { result } = renderHook(() => {
      return useDataDictionaryDraft(_draft("sex"));
    });
    act(() => {
      result.current.setDraft(_draft("gender"));
    });
    act(() => {
      result.current.markSaved(_draft("gender"));
    });
    expect(result.current.isDirty).toBe(false);
    expect(result.current.draft.entries[0]?.name).toBe("gender");
  });

  it("keeps edits made while a save was in flight", () => {
    const { result } = renderHook(() => {
      return useDataDictionaryDraft(_draft("sex"));
    });
    act(() => {
      result.current.setDraft(_draft("A"));
    });
    act(() => {
      result.current.setDraft(_draft("B"));
    });
    act(() => {
      result.current.markSaved(_draft("A"));
    });
    expect(result.current.isDirty).toBe(true);
    expect(result.current.draft.entries[0]?.name).toBe("B");
  });
});
