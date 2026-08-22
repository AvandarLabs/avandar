import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "@/test-utils";

import { MatchReport } from "./MatchReport";

describe("MatchReport", () => {
  it("shows totals, capped samples, and a back action", () => {
    const onBack = vi.fn();
    render(
      <MatchReport
        diagnostics={{
          sourceCount: 40,
          parsedCount: 20,
          invalidCount: 0,
          observedFamilies: ["polygon"],
          hasMixedFamilies: false,
          matchedSourceKeyCount: 24,
          unmatchedSourceKeyCount: 10,
          unmatchedBoundaryCount: 3,
          duplicateBoundaryKeyCount: 2,
          ambiguousSourceKeyCount: 4,
          unmatchedSourceKeySamples: ["North", "South"],
          duplicateBoundaryKeySamples: ["Central"],
          ambiguousSourceKeySamples: ["West"],
        }}
        onBack={onBack}
      />,
    );

    expect(screen.getByText("10 unmatched source keys")).toBeInTheDocument();
    expect(screen.getByText("3 boundaries without data")).toBeInTheDocument();
    expect(screen.getByText("2 duplicate boundary keys")).toBeInTheDocument();
    expect(screen.getByText("4 ambiguous source keys")).toBeInTheDocument();
    expect(screen.getByText("North, South")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
