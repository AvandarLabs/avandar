import { MantineProvider } from "@mantine/core";
import { SegmentedControl } from "@plugin-ui/SegmentedControl/SegmentedControl";
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

const INDICATOR_SELECTOR = ".mantine-SegmentedControl-indicator";

function _renderControl(): {
  ancestor: HTMLElement;
  getIndicator: () => Element;
} {
  render(
    <MantineProvider>
      <div data-testid="ancestor">
        <SegmentedControl
          aria-label="Interval"
          data={["Day", "Epi week", "Month"]}
          defaultValue="Epi week"
        />
      </div>
    </MantineProvider>,
  );
  const ancestor = screen.getByTestId("ancestor");
  return {
    ancestor,
    getIndicator: () => {
      const indicator = ancestor.querySelector(INDICATOR_SELECTOR);
      if (indicator === null) {
        throw new Error("The indicator is not rendered.");
      }
      return indicator;
    },
  };
}

function _endTransition(options: { target: Element; propertyName: string }) {
  // jsdom has no `TransitionEvent`, so the event carries the one field the
  // control reads.
  const event = Object.assign(new Event("transitionend", { bubbles: true }), {
    propertyName: options.propertyName,
  });
  act(() => {
    options.target.dispatchEvent(event);
  });
}

describe("SegmentedControl", () => {
  it("renders the choices as radios with the default one selected", () => {
    _renderControl();

    expect(screen.getByRole("radio", { name: "Epi week" })).toBeChecked();
  });

  it("measures the indicator again when an ancestor's transform transition ends", () => {
    const { ancestor, getIndicator } = _renderControl();
    const indicatorBefore = getIndicator();

    _endTransition({ target: ancestor, propertyName: "transform" });

    expect(getIndicator()).not.toBe(indicatorBefore);
    expect(screen.getByRole("radio", { name: "Epi week" })).toBeChecked();
  });

  it("keeps the indicator when an ancestor's other transition ends", () => {
    const { ancestor, getIndicator } = _renderControl();
    const indicatorBefore = getIndicator();

    _endTransition({ target: ancestor, propertyName: "opacity" });

    expect(getIndicator()).toBe(indicatorBefore);
  });

  it("keeps the indicator when the control's own transform transition ends", () => {
    const { getIndicator } = _renderControl();
    const indicatorBefore = getIndicator();

    _endTransition({ target: indicatorBefore, propertyName: "transform" });

    expect(getIndicator()).toBe(indicatorBefore);
  });

  it("keeps the indicator when the transition belongs to an unrelated element", () => {
    const { getIndicator } = _renderControl();
    const indicatorBefore = getIndicator();

    const unrelated = document.createElement("div");
    document.body.append(unrelated);
    _endTransition({ target: unrelated, propertyName: "transform" });
    unrelated.remove();

    expect(getIndicator()).toBe(indicatorBefore);
  });
});
