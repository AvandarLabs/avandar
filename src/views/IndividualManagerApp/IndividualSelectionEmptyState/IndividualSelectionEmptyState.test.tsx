import { describe, expect, it } from "vitest";

import { render, screen } from "@/test-utils";
import { IndividualSelectionEmptyState } from "@/views/IndividualManagerApp/IndividualSelectionEmptyState/IndividualSelectionEmptyState";

describe("IndividualSelectionEmptyState", () => {
  it("asks the user to pick a named case type and never says entity", () => {
    render(<IndividualSelectionEmptyState conceptName="County" hasRecords />);

    expect(
      screen.getByRole("heading", { name: "Select a County" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/entity/i)).toBeNull();
    expect(screen.queryByText(/create a new one/i)).toBeNull();
  });

  it("explains how to get records when the list is empty", () => {
    render(
      <IndividualSelectionEmptyState conceptName="County" hasRecords={false} />,
    );

    expect(
      screen.getByRole("heading", { name: "No County records yet" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/sync this case type/i)).toBeInTheDocument();
  });
});
