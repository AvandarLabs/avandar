import { describe, expect, it, vi } from "vitest";
import { INITIAL_NUX_STATE } from "@/components/Nux/NuxStateManager/initialNuxState";
import { NuxStateManager } from "@/components/Nux/NuxStateManager/NuxStateManager";
import { NuxTooltip } from "@/components/Nux/NuxTour/NuxTooltip/NuxTooltip";
import { ANIMATION_PRESET } from "@/config/Theme";
import { fireEvent, render, screen } from "@/test-utils";
import type { NuxJoyrideStepData } from "@/components/Nux/NuxTour/makeJoyrideStepsFromMilestone/makeJoyrideStepsFromMilestone";
import type { ReactNode } from "react";
import type { TooltipRenderProps } from "react-joyride";

function _tooltipProps(
  data: NuxJoyrideStepData | undefined,
  overrides: Partial<TooltipRenderProps> = {},
): TooltipRenderProps {
  return {
    index: 0,
    size: 3,
    isLastStep: false,
    continuous: true,
    step: { content: "Pick a file", data },
    primaryProps: { "aria-label": "Next", onClick: vi.fn() },
    backProps: {},
    closeProps: {},
    skipProps: {},
    tooltipProps: {},
    controls: {},
    ...overrides,
  } as unknown as TooltipRenderProps;
}

function _renderTooltip(
  data: NuxJoyrideStepData | undefined,
  overrides: Partial<TooltipRenderProps> = {},
  extra?: ReactNode,
): ReturnType<typeof render> {
  function Wrapper({ children }: { children: ReactNode }): ReactNode {
    return (
      <NuxStateManager.Provider
        initialStateOverrides={{
          ...INITIAL_NUX_STATE,
          isHydrated: true,
          status: "in_progress",
          completedMilestones: [],
          activeMilestoneKey: "add_dataset",
          isPanelExpanded: true,
        }}
      >
        {extra}
        {children}
      </NuxStateManager.Provider>
    );
  }
  return render(<NuxTooltip {..._tooltipProps(data, overrides)} />, {
    wrapper: Wrapper,
  });
}

describe("NuxTooltip", () => {
  it("shows an enabled Next when the step is not gated", () => {
    _renderTooltip(undefined);
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Close" })).toHaveAttribute(
      "data-variant",
      "default",
    );
  });

  it("hides Next when the step waits for an anchor", () => {
    _renderTooltip({ disableNextUntilAnchor: "dataset-import-form" });
    expect(
      screen.queryByRole("button", { name: "Next" }),
    ).not.toBeInTheDocument();
    const closeButton = screen.getByRole("button", { name: "Close" });
    expect(closeButton).toHaveAttribute("data-variant", "default");
  });

  it("hides Next when the step waits for an outcome", () => {
    _renderTooltip({ disableNextUntilEvent: "dataset.saved" });
    expect(
      screen.queryByRole("button", { name: "Next" }),
    ).not.toBeInTheDocument();
  });

  it("shows Next once the gated anchor is already in the document", () => {
    _renderTooltip(
      { disableNextUntilAnchor: "dataset-import-form" },
      {},
      <form data-nux="dataset-import-form" />,
    );
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("shows Done on the last ungated step", () => {
    _renderTooltip(undefined, {
      index: 2,
      isLastStep: true,
      primaryProps: {
        "aria-label": "Done",
        onClick: vi.fn(),
      } as unknown as TooltipRenderProps["primaryProps"],
    });
    expect(screen.getByRole("button", { name: "Done" })).toBeEnabled();
  });

  it("shows Back after the first tooltip", () => {
    _renderTooltip(undefined, { index: 1, size: 3 });
    expect(screen.getByRole("button", { name: "Back" })).toBeEnabled();
  });

  it("hides Back on the first tooltip", () => {
    _renderTooltip(undefined, { index: 0, size: 3 });
    expect(
      screen.queryByRole("button", { name: "Back" }),
    ).not.toBeInTheDocument();
  });

  it("hides Back when the step sets hideBack", () => {
    _renderTooltip({ hideBack: true }, { index: 2, size: 3 });
    expect(
      screen.queryByRole("button", { name: "Back" }),
    ).not.toBeInTheDocument();
  });

  it("plays the overlay pop-in entrance when it mounts", () => {
    _renderTooltip(undefined);
    expect(
      screen.getByText("Pick a file").closest(".mantine-Card-root"),
    ).toHaveClass(ANIMATION_PRESET.popIn.className);
  });

  it("collapses the tour on Close without invoking Joyride's close handler", () => {
    const joyrideClose = vi.fn();
    function MilestoneProbe(): ReactNode {
      const state = NuxStateManager.useState();
      return (
        <div data-testid="milestone">{state.activeMilestoneKey ?? "none"}</div>
      );
    }
    _renderTooltip(
      undefined,
      {
        closeProps: {
          "aria-label": "Close",
          onClick: joyrideClose,
        } as unknown as TooltipRenderProps["closeProps"],
      },
      <MilestoneProbe />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(joyrideClose).not.toHaveBeenCalled();
    expect(screen.getByTestId("milestone")).toHaveTextContent("none");
  });
});
