import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/utils/testingUtils";
import { ActionIcon } from "./index";
import type { ReactNode } from "react";

type ClickableProps = {
  onClick: () => void;
  children?: ReactNode;
};

describe("ActionIcon", () => {
  it("renders without crashing", () => {
    render(<ActionIcon>More actions</ActionIcon>);

    expect(
      screen.getByRole("button", { name: "More actions" }),
    ).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    const ClickableActionIcon = ActionIcon as unknown as (
      props: ClickableProps,
    ) => JSX.Element;

    render(
      <ClickableActionIcon onClick={onClick}>
        Clickable action
      </ClickableActionIcon>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clickable action" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders tooltip content when tooltip is forced open", () => {
    render(
      <ActionIcon tooltip="Tooltip label" tooltipProps={{ opened: true }}>
        Tooltip action
      </ActionIcon>,
    );

    expect(screen.getByText("Tooltip label")).toBeInTheDocument();
  });

  it("shows tooltip content on hover", async () => {
    render(
      <ActionIcon tooltip="Hover tooltip label">
        Hover tooltip action
      </ActionIcon>,
    );

    fireEvent.mouseEnter(
      screen.getByRole("button", { name: "Hover tooltip action" }),
    );

    await waitFor(() => {
      return expect(
        screen.getByText("Hover tooltip label"),
      ).toBeInTheDocument();
    });
  });
});
