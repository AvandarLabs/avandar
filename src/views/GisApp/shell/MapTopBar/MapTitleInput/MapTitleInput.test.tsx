import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { MapTitleInput } from "@/views/GisApp/shell/MapTopBar/MapTitleInput/MapTitleInput";

describe("MapTitleInput", () => {
  it("commits a trimmed name on blur", () => {
    const onNameChange = vi.fn();

    render(<MapTitleInput name="Old name" onNameChange={onNameChange} />);

    const input = screen.getByRole("textbox", { name: "Map name" });
    fireEvent.change(input, { target: { value: "  New name  " } });
    fireEvent.blur(input);

    expect(onNameChange).toHaveBeenCalledWith("New name");
  });

  it("cancels an edit on Escape without committing it", () => {
    const onNameChange = vi.fn();

    render(<MapTitleInput name="Old name" onNameChange={onNameChange} />);

    const input = screen.getByRole("textbox", { name: "Map name" });
    fireEvent.change(input, { target: { value: "Discarded name" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onNameChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("Old name");
  });

  it("restores the current name when a blank edit loses focus", () => {
    const onNameChange = vi.fn();

    render(<MapTitleInput name="Old name" onNameChange={onNameChange} />);

    const input = screen.getByRole("textbox", { name: "Map name" });
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);

    expect(onNameChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("Old name");
  });
});
