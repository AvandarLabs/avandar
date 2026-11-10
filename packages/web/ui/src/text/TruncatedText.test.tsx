import { MantineProvider } from "@mantine/core";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TruncatedText } from "./TruncatedText";

const LONG_NAME = "School Immunization Survey: From School Records";

function renderText(
  ui: JSX.Element,
): ReturnType<typeof render> {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe("TruncatedText", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(480);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(160);
  });

  it("shows the full text when a truncated label is hovered", async () => {
    renderText(<TruncatedText>{LONG_NAME}</TruncatedText>);

    act(() => {
      fireEvent.mouseEnter(screen.getByText(LONG_NAME));
    });

    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveTextContent(LONG_NAME);
    });
  });

  it("does not show a tooltip when the text fits", async () => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(80);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(160);

    renderText(<TruncatedText>Schools</TruncatedText>);

    act(() => {
      fireEvent.mouseEnter(screen.getByText("Schools"));
    });

    await expect(
      screen.findByRole("tooltip", undefined, { timeout: 300 }),
    ).rejects.toThrow();
  });

  it("shows a replacement tooltip even when the text fits", async () => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(80);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(160);

    renderText(
      <TruncatedText tooltipLabel="Unavailable offline">Schools</TruncatedText>,
    );

    act(() => {
      fireEvent.mouseEnter(screen.getByText("Schools"));
    });

    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveTextContent(
        "Unavailable offline",
      );
    });
  });
});
