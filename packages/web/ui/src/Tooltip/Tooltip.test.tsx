import { MantineProvider } from "@mantine/core";
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Tooltip } from "./Tooltip";

function renderTooltip(ui: JSX.Element) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe("Tooltip (@ui wrapper)", () => {
  it("shows on keyboard focus by default (events.focus = true)", async () => {
    renderTooltip(
      <Tooltip label="A11y tooltip">
        <button type="button" data-testid="trigger">
          trigger
        </button>
      </Tooltip>,
    );

    expect(screen.queryByRole("tooltip")).toBeNull();

    const trigger = screen.getByTestId("trigger");
    act(() => {
      trigger.focus();
    });

    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveTextContent("A11y tooltip");
    });
  });

  it("respects caller-provided events override (focus disabled)", async () => {
    renderTooltip(
      <Tooltip
        label="No focus tooltip"
        events={{ hover: true, focus: false, touch: false }}
      >
        <button type="button" data-testid="trigger">
          trigger
        </button>
      </Tooltip>,
    );

    const trigger = screen.getByTestId("trigger");
    act(() => {
      trigger.focus();
    });

    // Give Mantine a tick to potentially open the tooltip; if events.focus
    // is honored as false, it must not appear.
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
