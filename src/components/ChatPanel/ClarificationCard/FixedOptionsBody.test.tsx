import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { FixedOptionsBody } from "./FixedOptionsBody";

const OPTIONS = ["<value 1>", "Queens"];
const LABELS = ["Kings", "Queens"];

describe("FixedOptionsBody option labels", () => {
  it("shows a single choice's label and submits its value", () => {
    const onSubmit = vi.fn();
    render(
      <FixedOptionsBody
        options={OPTIONS}
        optionLabels={LABELS}
        multi={false}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.queryByText("<value 1>")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Kings" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSubmit).toHaveBeenCalledWith({
      kind: "preset",
      value: "<value 1>",
    });
  });

  it("shows each multiple choice's label and submits their values", () => {
    const onSubmit = vi.fn();
    render(
      <FixedOptionsBody
        options={OPTIONS}
        optionLabels={LABELS}
        multi
        onSubmit={onSubmit}
      />,
    );

    expect(screen.queryByText("<value 1>")).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "Kings" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(onSubmit).toHaveBeenCalledWith({
      kind: "preset",
      value: ["<value 1>"],
    });
  });

  it("shows the options as they are when it has no labels", () => {
    render(
      <FixedOptionsBody options={OPTIONS} multi={false} onSubmit={vi.fn()} />,
    );

    expect(screen.getByRole("radio", { name: "<value 1>" })).toBeVisible();
    expect(screen.getByRole("radio", { name: "Queens" })).toBeVisible();
  });
});
