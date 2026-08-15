import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { SkipLinks } from "@/views/GisApp/shell/SkipLinks/SkipLinks";
import { GIS_SKIP_TARGET_IDS } from "@/views/GisApp/shell/SkipLinks/SkipLinks.constants";

describe("SkipLinks", () => {
  it("links keyboard users to the inspector and map tools", () => {
    render(<SkipLinks isChromeHidden={false} />);

    expect(
      screen.getByRole("link", { name: "Skip to layer settings" }),
    ).toHaveAttribute("href", `#${GIS_SKIP_TARGET_IDS.inspectorBody}`);
    expect(
      screen.getByRole("link", { name: "Skip to map tools" }),
    ).toHaveAttribute("href", `#${GIS_SKIP_TARGET_IDS.toolCluster}`);
  });

  it("focuses a focusable target when a skip link is activated", () => {
    render(
      <>
        <SkipLinks isChromeHidden={false} />
        <div id={GIS_SKIP_TARGET_IDS.inspectorBody} tabIndex={-1} />
      </>,
    );

    fireEvent.click(
      screen.getByRole("link", { name: "Skip to layer settings" }),
    );

    expect(document.activeElement).toBe(
      document.getElementById(GIS_SKIP_TARGET_IDS.inspectorBody),
    );
  });
});
