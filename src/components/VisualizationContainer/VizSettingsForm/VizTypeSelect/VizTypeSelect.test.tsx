/**
 * Tests for the visualization type picker: that it renders the display name for
 * each type and reports the picked type back as a `VizType`.
 */
import { describe, expect, it, vi } from "vitest";
import { AvandarAppProvider } from "@/components/providers/AvandarAppProvider";
import { VizTypeSelect } from "@/components/VisualizationContainer/VizSettingsForm/VizTypeSelect/VizTypeSelect";
import { render, screen } from "@/test-utils";
import { pickMantineSelectOption } from "@/test-utils/pickMantineSelectOption";

function renderPicker(): { onChange: ReturnType<typeof vi.fn> } {
  const onChange = vi.fn();
  render(
    <AvandarAppProvider>
      <VizTypeSelect value="table" onChange={onChange} />
    </AvandarAppProvider>,
  );
  return { onChange };
}

describe("VizTypeSelect", () => {
  it("reports the picked visualization type", () => {
    const { onChange } = renderPicker();

    pickMantineSelectOption(/Visualization Type/i, "Bar Chart");

    expect(onChange).toHaveBeenCalledWith("bar");
  });

  it("shows the display name of the current type rather than its key", () => {
    renderPicker();

    expect(
      screen.getByRole("combobox", { name: /visualization type/i }),
    ).toHaveValue("Table");
  });
});
