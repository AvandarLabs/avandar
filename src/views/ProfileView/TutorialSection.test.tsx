import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { TutorialSection } from "@/views/ProfileView/TutorialSection";

describe("TutorialSection", () => {
  it("offers to restart the tutorial", () => {
    render(<TutorialSection onRestart={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Restart tutorial" }),
    ).toBeInTheDocument();
  });

  it("never says Nux", () => {
    const { container } = render(<TutorialSection onRestart={vi.fn()} />);
    expect(container.textContent?.toLowerCase()).not.toContain("nux");
  });

  it("calls back on click", () => {
    const onRestart = vi.fn();
    render(<TutorialSection onRestart={onRestart} />);
    fireEvent.click(screen.getByRole("button", { name: "Restart tutorial" }));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });
});
