import { describe, expect, it, vi } from "vitest";
import { CodeListPopover } from "@/components/dataDictionaries/CodeListPopover/CodeListPopover";
import { act, fireEvent, render, screen, waitFor, within } from "@/test-utils";
import type { ColumnCodes } from "$/models/dataDictionaries/ColumnCodes/ColumnCodes";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { unlabeledCount: undefined as number | undefined };
});

vi.mock(
  "@/components/dataDictionaries/CodeListPopover/useUnlabeledValueCount",
  () => {
    return {
      useUnlabeledValueCount: () => {
        return { count: mocks.unlabeledCount };
      },
    };
  },
);
// The router's `Link` needs a router; a plain anchor stands in for it.
vi.mock("@avandar/ui", async (importOriginal) => {
  const { createElement } = await import("react");
  const actual = await importOriginal<typeof import("@avandar/ui")>();
  return {
    ...actual,
    Link: ({ children }: { children: ReactNode }) => {
      return createElement("a", { href: "#dictionary" }, children);
    },
  };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "demo" };
    },
  };
});

/** A column's codes, as Task 13's `ColumnCodes.fromRows` returns them. */
function makeCodes(overrides: Partial<ColumnCodes.T> = {}): ColumnCodes.T {
  return {
    datasetColumnId: "col-gender",
    dictionaryId: "dict-nys",
    dictionaryName: "NYS codes",
    entryName: "sex",
    codeListName: "Sex (1/2/9)",
    isOrdered: false,
    mode: "reference",
    direction: "decode",
    pairs: [
      { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
      { code: "2", label: "Female", acceptedSpellings: [], isMissing: false },
    ],
    isPinned: false,
    appliedDictionaryVersion: 1,
    currentDictionaryVersion: 1,
    isSourceDeleted: false,
    keepsOriginal: false,
    ...overrides,
  };
}

const CODES = makeCodes({
  dictionaryName: "NYS measles case report",
  pairs: [
    { code: "1", label: "Male", acceptedSpellings: [], isMissing: false },
    { code: "2", label: "", acceptedSpellings: [], isMissing: false },
    { code: "9", label: "Unknown", acceptedSpellings: [], isMissing: true },
  ],
});

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

  it("draws the arrow on a dropdown that does not clip it", async () => {
    render(<CodeListPopover columnName="GENDER" codes={CODES} />);
    fireEvent.focus(
      screen.getByRole("button", { name: "Code list for GENDER" }),
    );
    const dialog = await screen.findByRole("dialog");

    expect(dialog.querySelector(".mantine-Popover-arrow")).not.toBeNull();
    expect(getComputedStyle(dialog).overflowY).not.toBe("auto");
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

  it("says the values were converted, with the version a pinned column was given", async () => {
    render(
      <CodeListPopover
        columnName="GENDER"
        codes={makeCodes({
          mode: "convert",
          direction: "encode",
          isPinned: true,
          appliedDictionaryVersion: 2,
          currentDictionaryVersion: 3,
          keepsOriginal: true,
        })}
      />,
    );
    fireEvent.focus(
      screen.getByRole("button", { name: "Code list for GENDER" }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(
      "From NYS codes › sex. The values were converted to these labels.",
    );
    expect(dialog).toHaveTextContent(
      "Converted with version 2 of the dictionary. The dictionary is now at version 3.",
    );
    expect(dialog).toHaveTextContent(
      "The original values are kept beside it, in a column ending in _original.",
    );
  });

  it("says codes when labels were converted to codes", async () => {
    render(
      <CodeListPopover
        columnName="GENDER"
        codes={makeCodes({ mode: "convert", direction: "decode" })}
      />,
    );
    fireEvent.focus(
      screen.getByRole("button", { name: "Code list for GENDER" }),
    );

    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "The values were converted to these codes.",
    );
  });

  it("says when the dictionary entry behind a conversion was deleted", async () => {
    render(
      <CodeListPopover
        columnName="GENDER"
        codes={makeCodes({
          dictionaryId: "",
          dictionaryName: "",
          entryName: "",
          codeListName: undefined,
          mode: "convert",
          direction: "encode",
          isPinned: true,
          isSourceDeleted: true,
          currentDictionaryVersion: undefined,
        })}
      />,
    );
    fireEvent.focus(
      screen.getByRole("button", { name: "Code list for GENDER" }),
    );

    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "The values were converted to these labels. The dictionary entry they came from was deleted.",
    );
  });

  it("counts the values with no label in a converted column", async () => {
    mocks.unlabeledCount = 3;
    render(
      <CodeListPopover
        columnName="GENDER"
        datasetId={"dataset-1" as Dataset.Id}
        codes={makeCodes({ mode: "convert", direction: "encode" })}
      />,
    );
    fireEvent.focus(
      screen.getByRole("button", { name: "Code list for GENDER" }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("3 values in the data have no label.");
    // jsdom never finishes the dropdown's enter transition, so the dialog
    // keeps an inline `display: none` and its link counts as hidden.
    expect(
      within(dialog).getByRole("link", {
        name: "Label them in NYS codes",
        hidden: true,
      }),
    ).toBeInTheDocument();
    mocks.unlabeledCount = undefined;
  });

  it("lets the keyboard reach the dropdown's link and Escape back to the tag", async () => {
    mocks.unlabeledCount = 3;
    try {
      render(
        <CodeListPopover
          columnName="GENDER"
          datasetId={"dataset-1" as Dataset.Id}
          codes={makeCodes({ mode: "convert", direction: "encode" })}
        />,
      );
      const tag = screen.getByRole("button", { name: "Code list for GENDER" });
      act(() => {
        tag.focus();
      });
      const dialog = await screen.findByRole("dialog");
      const link = within(dialog).getByRole("link", {
        name: "Label them in NYS codes",
        hidden: true,
      });

      fireEvent.keyDown(tag, { key: "Tab" });
      expect(link).toHaveFocus();

      // Focus inside the dropdown keeps it open past the close delay.
      await new Promise((resolve) => {
        setTimeout(resolve, 300);
      });
      expect(screen.getByRole("dialog", { hidden: true })).toBeInTheDocument();

      fireEvent.keyDown(link, { key: "Escape" });
      await waitFor(() => {
        expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
      });
      expect(tag).toHaveFocus();
    } finally {
      mocks.unlabeledCount = undefined;
    }
  });

  it("names the list when its entry was deleted", async () => {
    render(
      <CodeListPopover
        columnName="GENDER"
        codes={makeCodes({
          dictionaryId: "",
          dictionaryName: "",
          entryName: "",
          codeListName: undefined,
          mode: "convert",
          direction: "encode",
          isPinned: true,
          isSourceDeleted: true,
          currentDictionaryVersion: undefined,
        })}
      />,
    );
    fireEvent.focus(
      screen.getByRole("button", { name: "Code list for GENDER" }),
    );

    expect(await screen.findByRole("dialog")).toHaveTextContent(/^Code list/);
  });
});
