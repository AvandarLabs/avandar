import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";

describe("InspectorSection", () => {
  it("opens and focuses its header for an external review request", () => {
    render(
      <InspectorSection title="Filter" focusRequest={1}>
        <div>Filter controls</div>
      </InspectorSection>,
    );

    const toggle = screen.getByRole("button", { name: "Filter" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveFocus();
  });
});
