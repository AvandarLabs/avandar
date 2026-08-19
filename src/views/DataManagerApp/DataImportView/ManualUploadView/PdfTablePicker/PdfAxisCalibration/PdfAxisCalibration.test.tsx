import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { PdfAxisCalibration } from "./PdfAxisCalibration";

describe("PdfAxisCalibration", () => {
  it("starts a two-point pick when Calibrate manually is pressed", () => {
    const onStart = vi.fn();
    render(
      <PdfAxisCalibration
        points={[]}
        isPicking={false}
        onStart={onStart}
        onApply={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /calibrate manually/i }),
    );
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("asks for the first click once picking has started", () => {
    render(
      <PdfAxisCalibration
        isPicking
        points={[]}
        onStart={vi.fn()}
        onApply={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/click a labelled tick on the y-axis/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /calibrate manually/i }),
    ).not.toBeInTheDocument();
  });

  it("writes the two y positions once both tick values are applied", () => {
    const onApply = vi.fn();
    render(
      <PdfAxisCalibration
        isPicking
        points={[
          { x: 40, y: 91.8 },
          { x: 40, y: 180.5 },
        ]}
        onStart={vi.fn()}
        onApply={onApply}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/first tick value/i), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText(/second tick value/i), {
      target: { value: "10000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /apply calibration/i }));

    expect(onApply).toHaveBeenCalledWith([
      { position: 91.8, value: 0 },
      { position: 180.5, value: 10000 },
    ]);
  });

  it("does not apply when a tick value is still missing", () => {
    const onApply = vi.fn();
    render(
      <PdfAxisCalibration
        isPicking
        points={[
          { x: 40, y: 91.8 },
          { x: 40, y: 180.5 },
        ]}
        onStart={vi.fn()}
        onApply={onApply}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/first tick value/i), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: /apply calibration/i }));

    expect(onApply).not.toHaveBeenCalled();
  });
});
