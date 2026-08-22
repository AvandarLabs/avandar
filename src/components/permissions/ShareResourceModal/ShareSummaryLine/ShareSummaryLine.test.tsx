import { describe, expect, it } from "vitest";
import { ShareSummaryLine } from "@/components/permissions/ShareResourceModal/ShareSummaryLine/ShareSummaryLine";
import { render, screen } from "@/test-utils";

describe("ShareSummaryLine", () => {
  it("renders interleaved text segments and pill labels", () => {
    render(
      <ShareSummaryLine
        spans={[
          { kind: "text", text: "Shared with " },
          { kind: "pill", label: "William Farr", variant: "user" },
          { kind: "text", text: "." },
        ]}
      />,
    );
    expect(screen.getByText("Shared with")).toBeInTheDocument();
    expect(screen.getByText("William Farr")).toBeInTheDocument();
  });

  it("renders the empty-state owner-only sentence as a single text span", () => {
    render(
      <ShareSummaryLine
        spans={[
          {
            kind: "text",
            text: "This dataset is currently only accessible to its owner.",
          },
        ]}
      />,
    );
    expect(
      screen.getByText(
        "This dataset is currently only accessible to its owner.",
      ),
    ).toBeInTheDocument();
  });

  it("exposes role=status with the 'Share summary' accessible name", () => {
    render(
      <ShareSummaryLine
        spans={[
          { kind: "text", text: "Shared with " },
          { kind: "pill", label: "William Farr", variant: "user" },
          { kind: "text", text: "." },
        ]}
      />,
    );
    const summary = screen.getByRole("status", { name: "Share summary" });
    expect(summary).toBeInTheDocument();
    expect(summary).toHaveTextContent("William Farr");
  });
});
