import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { NewDictionaryStepHeading } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/NewDictionaryStepHeading";

describe("NewDictionaryStepHeading", () => {
  it("names the current step with a heading", () => {
    render(<NewDictionaryStepHeading step="review" />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Review columns" }),
    ).toBeInTheDocument();
  });

  it("leaves focus alone when the flow opens", () => {
    render(<NewDictionaryStepHeading step="pick" />);
    expect(
      screen.getByRole("heading", { name: "Pick datasets" }),
    ).not.toHaveFocus();
  });

  it("moves focus to the heading when the step changes", () => {
    const { rerender } = render(<NewDictionaryStepHeading step="review" />);
    rerender(<NewDictionaryStepHeading step="label" />);
    expect(screen.getByRole("heading", { name: "Label values" })).toHaveFocus();
  });
});
