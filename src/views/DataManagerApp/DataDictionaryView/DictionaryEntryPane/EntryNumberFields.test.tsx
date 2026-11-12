import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { EntryNumberFields } from "@/views/DataManagerApp/DataDictionaryView/DictionaryEntryPane/EntryNumberFields";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { ReactNode } from "react";

const ENTRY: DataDictionary.EntryDraft = {
  id: "11111111-1111-4111-8111-111111111111" as DataDictionaryEntry.Id,
  name: "temperature",
  columnNames: [],
  kind: "number",
  unit: "",
  validMin: undefined,
  validMax: undefined,
  description: "",
  codings: [],
};

function Harness(): ReactNode {
  const [entry, setEntry] = useState(ENTRY);
  return (
    <>
      <EntryNumberFields
        entry={entry}
        issues={[]}
        canEdit
        onChange={(changes) => {
          setEntry({ ...entry, ...changes });
        }}
      />
      <output aria-label="Stored lowest value">{String(entry.validMin)}</output>
    </>
  );
}

describe("EntryNumberFields", () => {
  it("lets a negative number be typed, keeping the minus sign on screen", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Lowest valid value");
    fireEvent.change(input, { target: { value: "-" } });
    expect(input).toHaveValue("-");
    fireEvent.change(input, { target: { value: "-5" } });
    expect(input).toHaveValue("-5");
    expect(screen.getByLabelText("Stored lowest value")).toHaveTextContent(
      "-5",
    );
  });

  it("clears the stored value when the field is emptied", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Lowest valid value");
    fireEvent.change(input, { target: { value: "3" } });
    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByLabelText("Stored lowest value")).toHaveTextContent(
      "undefined",
    );
  });
});
