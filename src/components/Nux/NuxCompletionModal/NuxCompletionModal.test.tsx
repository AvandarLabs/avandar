import { describe, expect, it, vi } from "vitest";

import { NuxCompletionModal } from "@/components/Nux/NuxCompletionModal/NuxCompletionModal";
import { fireEvent, render, screen } from "@/test-utils";

describe("NuxCompletionModal", () => {
  it("congratulates the user on sharing with their workspace", () => {
    render(<NuxCompletionModal isOpen onClose={vi.fn()} />);
    expect(
      screen.getByRole("dialog", { name: /congratulations/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/shared your first dashboard with your workspace/i),
    ).toBeInTheDocument();
  });

  it("closes from the continue button", () => {
    const onClose = vi.fn();
    render(<NuxCompletionModal isOpen onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when closed", () => {
    render(<NuxCompletionModal isOpen={false} onClose={vi.fn()} />);
    expect(
      screen.queryByRole("dialog", { name: /congratulations/i }),
    ).not.toBeInTheDocument();
  });
});
