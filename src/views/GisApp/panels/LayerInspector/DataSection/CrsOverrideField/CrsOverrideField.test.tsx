import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "@/test-utils";

import { CrsOverrideField } from "./CrsOverrideField";

describe("CrsOverrideField", () => {
  it("offers the supported CRS presets and stores the selected EPSG code", () => {
    const onChange = vi.fn();
    render(<CrsOverrideField sourceCrs={undefined} onChange={onChange} />);

    fireEvent.click(screen.getByRole("combobox", { name: "Source CRS" }));
    expect(
      screen.getByRole("option", {
        name: "3857 - Web Mercator",
        hidden: true,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", {
        name: "32633 - UTM north zone 33",
        hidden: true,
      }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("option", {
        name: "3857 - Web Mercator",
        hidden: true,
      }),
    );

    expect(onChange).toHaveBeenCalledWith(3857);
  });

  it("accepts a custom positive EPSG integer and clears to no override", () => {
    const onChange = vi.fn();
    render(<CrsOverrideField sourceCrs={4326} onChange={onChange} />);
    const input = screen.getByRole("textbox", { name: "EPSG code" });

    fireEvent.change(input, { target: { value: "3413" } });
    fireEvent.change(input, { target: { value: "" } });

    expect(onChange).toHaveBeenNthCalledWith(1, 3413);
    expect(onChange).toHaveBeenNthCalledWith(2, undefined);
  });
});
