import { act, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { useCheckTruncatedText } from "./useCheckTruncatedText";

function mockElementWidths(
  element: HTMLElement,
  options: { clientWidth: number; scrollWidth: number },
): void {
  Object.defineProperty(element, "clientWidth", {
    configurable: true,
    value: options.clientWidth,
  });
  Object.defineProperty(element, "scrollWidth", {
    configurable: true,
    value: options.scrollWidth,
  });
}

type HarnessProps = {
  /** Bumps this to re-run the hook layout effect after mocking widths. */
  measureKey: number;
  text?: string;
};

function TruncationHarness(props: HarnessProps) {
  const { measureKey, text = "label" } = props;
  const [setRef, isTruncated] = useCheckTruncatedText<HTMLDivElement>([
    measureKey,
    text,
  ]);

  return (
    <div
      data-testid="truncation-target"
      data-truncated={String(isTruncated)}
      ref={setRef}
    >
      {text}
    </div>
  );
}

function TruncationHarnessSingleDep(props: { measureKey: number }) {
  const { measureKey } = props;
  const [setRef, isTruncated] = useCheckTruncatedText<HTMLDivElement>(
    measureKey,
  );

  return (
    <div
      data-testid="truncation-target"
      data-truncated={String(isTruncated)}
      ref={setRef}
    >
      fixed
    </div>
  );
}

function UnmountRefHarness() {
  const [measureKey, setMeasureKey] = useState(0);
  const [setRef, isTruncated] = useCheckTruncatedText<HTMLDivElement>([
    measureKey,
  ]);
  const [showTarget, setShowTarget] = useState(true);

  return (
    <>
      <span data-testid="truncation-flag" data-truncated={String(isTruncated)} />
      {showTarget ?
        <div data-testid="inner" ref={setRef}>
          inner
        </div>
      : null}
      <button
        type="button"
        onClick={() => {
          setMeasureKey((previous) => {
            return previous + 1;
          });
        }}
      >
        remeasure
      </button>
      <button
        type="button"
        onClick={() => {
          setShowTarget(false);
        }}
      >
        hide
      </button>
    </>
  );
}

describe("useCheckTruncatedText", () => {
  it("sets isTruncated true when scrollWidth exceeds clientWidth", async () => {
    const { rerender } = render(<TruncationHarness measureKey={0} />);
    const target = screen.getByTestId("truncation-target");

    mockElementWidths(target, { clientWidth: 40, scrollWidth: 200 });
    rerender(<TruncationHarness measureKey={1} />);

    await waitFor(() => {
      expect(target).toHaveAttribute("data-truncated", "true");
    });
  });

  it("sets isTruncated false when scrollWidth does not exceed clientWidth", async () => {
    const { rerender } = render(<TruncationHarness measureKey={0} />);
    const target = screen.getByTestId("truncation-target");

    mockElementWidths(target, { clientWidth: 200, scrollWidth: 80 });
    rerender(<TruncationHarness measureKey={1} />);

    await waitFor(() => {
      expect(target).toHaveAttribute("data-truncated", "false");
    });
  });

  it("accepts a non-array dependency and still re-measures", async () => {
    const { rerender } = render(<TruncationHarnessSingleDep measureKey={0} />);
    const target = screen.getByTestId("truncation-target");

    mockElementWidths(target, { clientWidth: 10, scrollWidth: 50 });
    rerender(<TruncationHarnessSingleDep measureKey={1} />);

    await waitFor(() => {
      expect(target).toHaveAttribute("data-truncated", "true");
    });
  });

  it("clears isTruncated when the ref target unmounts", async () => {
    render(<UnmountRefHarness />);
    const inner = screen.getByTestId("inner");
    const flag = screen.getByTestId("truncation-flag");

    mockElementWidths(inner, { clientWidth: 5, scrollWidth: 100 });
    await act(async () => {
      screen.getByRole("button", { name: "remeasure" }).click();
    });

    await waitFor(() => {
      expect(flag).toHaveAttribute("data-truncated", "true");
    });

    await act(async () => {
      screen.getByRole("button", { name: "hide" }).click();
    });

    await waitFor(() => {
      expect(flag).toHaveAttribute("data-truncated", "false");
    });
  });
});
