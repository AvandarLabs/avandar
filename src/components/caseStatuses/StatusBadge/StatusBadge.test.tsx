import { describe, expect, it } from "vitest";
import { StatusBadge } from "@/components/caseStatuses/StatusBadge/StatusBadge";
import { act, render, screen, waitFor } from "@/test-utils";

const DESCRIPTION = "A lab test came back positive.";

describe("StatusBadge", () => {
  it("shows what the status means when the badge has keyboard focus", async () => {
    render(
      <StatusBadge name="Confirmed" color="#fa5252" description={DESCRIPTION} />,
    );

    const badge = screen
      .getByText("Confirmed")
      .closest<HTMLElement>("[tabindex='0']");
    expect(badge).not.toBeNull();
    act(() => {
      badge?.focus();
    });

    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveTextContent(DESCRIPTION);
    });
  });

  it("takes no focus inside a control that explains the status itself", () => {
    render(
      <StatusBadge
        name="Confirmed"
        color="#fa5252"
        description={DESCRIPTION}
        withTooltip={false}
      />,
    );

    expect(screen.getByText("Confirmed").closest("[tabindex]")).toBeNull();
  });
});
