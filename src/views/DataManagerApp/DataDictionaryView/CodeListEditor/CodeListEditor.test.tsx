import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { CodeListEditor } from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodeListEditor";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ReactNode } from "react";

/** jsdom has no `document.fonts`, which autosize textareas listen to. */
beforeAll(() => {
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
  });
});

const LIST_ID =
  "66666666-6666-4666-8666-666666666666" as DataDictionaryCodeList.Id;

function _draft(pairs: DataDictionaryCodeList.Pair[]): DataDictionary.Draft {
  return {
    entries: [],
    codeLists: [{ id: LIST_ID, name: "Sex", isOrdered: false, pairs }],
  };
}

function _lastDraft(
  onDraftChange: ReturnType<typeof vi.fn>,
): DataDictionary.Draft {
  return onDraftChange.mock.calls.at(-1)?.[0] as DataDictionary.Draft;
}

describe("CodeListEditor", () => {
  it("edits a label and adds a value", () => {
    const onDraftChange = vi.fn();
    const draft = _draft([
      { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
    ]);
    render(
      <CodeListEditor
        draft={draft}
        codeListId={LIST_ID}
        issues={[]}
        canEdit
        onDraftChange={onDraftChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Label 1"), {
      target: { value: "Man" },
    });
    expect(_lastDraft(onDraftChange).codeLists[0]?.pairs[0]?.label).toBe("Man");

    fireEvent.click(screen.getByRole("button", { name: "Add value" }));
    expect(_lastDraft(onDraftChange).codeLists[0]?.pairs).toHaveLength(2);
  });

  it("replaces a single empty row with pasted values", async () => {
    const onDraftChange = vi.fn();
    const draft = _draft([
      { code: "", label: "", acceptedSpellings: [], isMissing: false },
    ]);
    render(
      <CodeListEditor
        draft={draft}
        codeListId={LIST_ID}
        issues={[]}
        canEdit
        onDraftChange={onDraftChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Paste a list" }));
    fireEvent.change(await screen.findByLabelText("Values to add"), {
      target: { value: "1 = Male\n2 = Female" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add 2 values" }));

    expect(
      _lastDraft(onDraftChange).codeLists[0]?.pairs.map((pair) => {
        return pair.label;
      }),
    ).toEqual(["Male", "Female"]);
  });

  it("explains that pairs work both ways and shows pair issues on their row", () => {
    const draft = _draft([
      { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
      { code: "1", label: "Man", acceptedSpellings: [], isMissing: false },
    ]);
    render(
      <CodeListEditor
        draft={draft}
        codeListId={LIST_ID}
        issues={[
          { type: "code_not_unique", codeListId: LIST_ID, pairIndex: 1 },
        ]}
        canEdit
        onDraftChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/Pairs work both ways/)).toBeInTheDocument();
    expect(
      screen.getAllByText(/This code is already in the list/),
    ).not.toHaveLength(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const codeInput = screen.getByLabelText("Code 2");
    expect(codeInput).toHaveAttribute("aria-invalid", "true");
    expect(codeInput).toHaveAccessibleDescription(
      /This code is already in the list/,
    );
    expect(screen.getByLabelText("Label 2")).not.toHaveAttribute(
      "aria-invalid",
    );
  });

  it("marks the label input when the label is the repeated part", () => {
    const draft = _draft([
      { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
      { code: "2", label: "Male", acceptedSpellings: [], isMissing: false },
    ]);
    render(
      <CodeListEditor
        draft={draft}
        codeListId={LIST_ID}
        issues={[
          { type: "label_not_unique", codeListId: LIST_ID, pairIndex: 1 },
        ]}
        canEdit
        onDraftChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Label 2")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Code 2")).not.toHaveAttribute("aria-invalid");
  });

  it("moves a value one place with Alt and an arrow on an ordered list", () => {
    const onDraftChange = vi.fn();
    const draft = _draft([
      { code: "1", label: "Low", acceptedSpellings: [], isMissing: false },
      { code: "2", label: "High", acceptedSpellings: [], isMissing: false },
    ]);
    const [list] = draft.codeLists;
    render(
      <CodeListEditor
        draft={{ ...draft, codeLists: [{ ...list!, isOrdered: true }] }}
        codeListId={LIST_ID}
        issues={[]}
        canEdit
        onDraftChange={onDraftChange}
      />,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Reorder Low" }), {
      key: "ArrowDown",
      altKey: true,
    });
    expect(
      _lastDraft(onDraftChange).codeLists[0]?.pairs.map((pair) => {
        return pair.label;
      }),
    ).toEqual(["High", "Low"]);
  });

  it("keeps focus on the moved value's handle after a keyboard move", () => {
    const initialDraft = _draft([
      { code: "1", label: "Low", acceptedSpellings: [], isMissing: false },
      { code: "2", label: "High", acceptedSpellings: [], isMissing: false },
    ]);
    const [list] = initialDraft.codeLists;
    function Harness(): ReactNode {
      const [draft, setDraft] = useState<DataDictionary.Draft>({
        ...initialDraft,
        codeLists: [{ ...list!, isOrdered: true }],
      });
      return (
        <CodeListEditor
          draft={draft}
          codeListId={LIST_ID}
          issues={[]}
          canEdit
          onDraftChange={setDraft}
        />
      );
    }
    render(<Harness />);
    const handle = screen.getByRole("button", { name: "Reorder Low" });
    handle.focus();
    fireEvent.keyDown(handle, { key: "ArrowDown", altKey: true });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Reorder Low" }),
    );
    expect(
      screen.getAllByRole("listitem").map((item) => {
        return item.getAttribute("aria-label");
      }),
    ).toEqual(["High", "Low"]);
  });
});
