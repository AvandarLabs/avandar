import { describe, expect, it, vi } from "vitest";
import { NuxWelcomeModal } from "@/components/Nux/NuxWelcomeModal/NuxWelcomeModal";
import { fireEvent, render, screen } from "@/test-utils";

describe("NuxWelcomeModal", () => {
  it("sets expectations without promising anything about the team", () => {
    render(<NuxWelcomeModal isOpen onStart={vi.fn()} onDecline={vi.fn()} />);
    expect(screen.getByText("Welcome to Avandar")).toBeInTheDocument();
    expect(
      screen.getByText(/spreadsheet to your first dashboard/),
    ).toBeInTheDocument();
  });

  it("starts the tutorial", () => {
    const onStart = vi.fn();
    render(<NuxWelcomeModal isOpen onStart={onStart} onDecline={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Start tour" }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("declines the tutorial", () => {
    const onDecline = vi.fn();
    render(<NuxWelcomeModal isOpen onStart={vi.fn()} onDecline={onDecline} />);
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when closed", () => {
    render(
      <NuxWelcomeModal isOpen={false} onStart={vi.fn()} onDecline={vi.fn()} />,
    );
    expect(screen.queryByText("Welcome to Avandar")).not.toBeInTheDocument();
  });
});
