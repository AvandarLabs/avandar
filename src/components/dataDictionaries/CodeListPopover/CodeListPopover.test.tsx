import { describe, expect, it, vi } from "vitest";
import { CodeListPopover } from "@/components/dataDictionaries/CodeListPopover/CodeListPopover";
import { act, fireEvent, render, screen, waitFor } from "@/test-utils";
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

  it("closes on Escape while the tag has focus", async () => {
    render(<CodeListPopover columnName="GENDER" codes={CODES} />);
    const tag = screen.getByRole("button", { name: "Code list for GENDER" });
    fireEvent.focus(tag);
    await screen.findByRole("dialog");

    fireEvent.keyDown(tag, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("stays open while the tag has focus and the pointer leaves", async () => {
    vi.useFakeTimers();
    try {
      render(<CodeListPopover columnName="GENDER" codes={CODES} />);
      const tag = screen.getByRole("button", {
        name: "Code list for GENDER",
      });
      fireEvent.focus(tag);
      fireEvent.mouseEnter(tag);
      fireEvent.mouseLeave(tag);
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(
        screen.getByRole("dialog", { name: "Code list for GENDER" }),
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
