import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { DataDictionarySaveBar } from "@/views/DataManagerApp/DataDictionaryView/DataDictionarySaveBar/DataDictionarySaveBar";

describe("DataDictionarySaveBar", () => {
  it("blocks saving while there are issues and says how many", () => {
    render(
      <DataDictionarySaveBar
        issueCount={2}
        isSaving={false}
        saveErrorMessage={undefined}
        onDiscard={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(
      screen.getByText("2 things to fix before saving"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("saves and discards", () => {
    const onSave = vi.fn();
    const onDiscard = vi.fn();
    render(
      <DataDictionarySaveBar
        issueCount={0}
        isSaving={false}
        saveErrorMessage="The dictionary was not saved."
        onDiscard={onDiscard}
        onSave={onSave}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The dictionary was not saved.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it("is marked as a sticky action bar", () => {
    const { container } = render(
      <DataDictionarySaveBar
        issueCount={0}
        isSaving={false}
        saveErrorMessage={undefined}
        onDiscard={vi.fn()}
        onSave={vi.fn()}
      />,
    );
    expect(container.querySelector("[data-sticky-action-bar]")).not.toBeNull();
  });
});
