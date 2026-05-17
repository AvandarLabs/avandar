import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShareSummaryLine } from "@/components/permissions/ShareResourceModal/ShareSummaryLine";
import { render } from "@/utils/testing-utils";

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
});
