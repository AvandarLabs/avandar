import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { EditableDisplayText } from "./EditableDisplayText";

describe("EditableDisplayText", () => {
  const fontsDescriptor = Object.getOwnPropertyDescriptor(document, "fonts");
  beforeAll(() => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: new EventTarget(),
    });
  });
  afterAll(() => {
    if (fontsDescriptor) {
      Object.defineProperty(document, "fonts", fontsDescriptor);
    } else {
      Reflect.deleteProperty(document, "fonts");
    }
  });
  it("focuses the single-line input and saves with Enter", () => {
    const onSave = vi.fn();
    render(
      <MantineProvider>
        <EditableDisplayText
          value="Title"
          onChange={() => {}}
          onSave={onSave}
        />
      </MantineProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("textbox")).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onSave).toHaveBeenCalledWith("Title");
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("keeps multiline edits open on Enter and cancels with Escape", () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <MantineProvider>
        <EditableDisplayText
          textarea
          value="Description"
          onChange={() => {}}
          onSave={onSave}
          onCancel={onCancel}
        />
      </MantineProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("textbox")).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalledOnce();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("blocks the save keyboard shortcut when saving is disabled", () => {
    const onSave = vi.fn();
    render(
      <MantineProvider>
        <EditableDisplayText
          isSaveDisabled
          value="Title"
          onChange={() => {}}
          onSave={onSave}
        />
      </MantineProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
