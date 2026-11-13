import { describe, expect, it } from "vitest";
import { CodeListPopover } from "@/components/dataDictionaries/CodeListPopover/CodeListPopover";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";

const CODES: ColumnCodes.T = {
  datasetColumnId: "col-gender",
  dictionaryId: "dict-1",
  dictionaryName: "NYS measles case report",
  entryName: "sex",
  codeListName: "Sex (1/2/9)",
  isOrdered: false,
  mode: "reference",
  direction: "decode",
  pairs: [
    { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
    { code: "2", label: "", acceptedSpellings: [], isMissing: false },
    { code: "9", label: "Unknown", acceptedSpellings: [], isMissing: true },
  ],
};

describe("CodeListPopover", () => {
  it("shows the code list when the tag gets keyboard focus", async () => {
    render(<CodeListPopover columnName="GENDER" codes={CODES} />);

    fireEvent.focus(
      screen.getByRole("button", { name: "Code list for GENDER" }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Code list for GENDER",
    });
    expect(dialog).toHaveTextContent("Sex (1/2/9)");
    expect(dialog).toHaveTextContent("Unknown (missing value)");
    expect(dialog).toHaveTextContent(
      "From NYS measles case report › sex. Attached as reference.",
    );
  });

  it("says a code has no label yet", async () => {
    render(<CodeListPopover columnName="GENDER" codes={CODES} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Code list for GENDER" }),
    );

    expect(await screen.findByText("No label yet")).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    render(<CodeListPopover columnName="GENDER" codes={CODES} />);
    const tag = screen.getByRole("button", { name: "Code list for GENDER" });
    fireEvent.click(tag);
    const dialog = await screen.findByRole("dialog");

    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});
