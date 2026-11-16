import { describe, expect, it, vi } from "vitest";
import { StatusColorPicker } from "@/components/caseStatuses/StatusColorPicker/StatusColorPicker";
import { fireEvent, render, screen } from "@/test-utils";

describe("StatusColorPicker", () => {
  it("names the status and its current color on the swatch button", () => {
    render(
      <StatusColorPicker
        color="#40c057"
        statusName="Active"
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Active color: Green" }),
    ).toBeInTheDocument();
  });

  it("reports the palette color picked for the status", async () => {
    const onChange = vi.fn();
    render(
      <StatusColorPicker
        color="#40c057"
        statusName="Active"
        onChange={onChange}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Active color: Green" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Red" }));

    expect(onChange).toHaveBeenCalledWith("#fa5252");
  });
});
