import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { CaseDetailsRail } from "@/views/IndividualManagerApp/SingleIndividualView/CaseDetailsRail";

describe("CaseDetailsRail", () => {
  it("lists each field with its value and source, and never shows internal ids", () => {
    render(
      <CaseDetailsRail
        attributes={[
          {
            name: "Borough",
            value: "Brooklyn",
            sourceName: "Measles line list",
          },
          { name: "MMR status", value: "Unknown" },
        ]}
      />,
    );
    expect(screen.getByText("Borough")).toBeInTheDocument();
    expect(screen.getByText("Brooklyn")).toBeInTheDocument();
    expect(screen.getByText("Measles line list")).toBeInTheDocument();
    expect(
      screen.queryByText(/[0-9a-f]{8}-[0-9a-f]{4}/),
    ).not.toBeInTheDocument();
  });

  it("says so when the record has no fields", () => {
    render(<CaseDetailsRail attributes={[]} />);
    expect(screen.getByText("No fields yet")).toBeInTheDocument();
  });

  it("waits quietly while fields load", () => {
    render(<CaseDetailsRail attributes={undefined} />);
    expect(
      screen.getByRole("heading", { name: "Details" }),
    ).toBeInTheDocument();
  });
});
