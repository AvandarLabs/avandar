import { describe, expect, it } from "vitest";
import { ValueSideHeading } from "@/components/dataDictionaries/ValueSideHint/ValueSideHeading";
import { ValueSideHint } from "@/components/dataDictionaries/ValueSideHint/ValueSideHint";
import { fireEvent, render, screen, waitFor } from "@/test-utils";

describe("ValueSideHint", () => {
  it("explains a source value when the info icon takes keyboard focus", async () => {
    render(<ValueSideHint side="source" />);
    const icon = screen.getByRole("button", {
      name: "What is a source value?",
    });
    fireEvent.focus(icon);
    await waitFor(() => {
      expect(
        screen.getByText(
          'A value as it appears in the data, such as 1 or "M".',
        ),
      ).toBeInTheDocument();
    });
  });

  it("explains a target value on hover", async () => {
    render(<ValueSideHint side="target" />);
    fireEvent.mouseEnter(
      screen.getByRole("button", { name: "What is a target value?" }),
    );
    await waitFor(() => {
      expect(
        screen.getByText(/What the source value is converted to/),
      ).toBeInTheDocument();
    });
  });

  it("explains both sides for the direction switch", async () => {
    render(<ValueSideHint side="both" />);
    fireEvent.focus(
      screen.getByRole("button", {
        name: "What are source and target values?",
      }),
    );
    await waitFor(() => {
      expect(screen.getByText(/A value as it appears/)).toBeInTheDocument();
      expect(
        screen.getByText(/What the source value is converted to/),
      ).toBeInTheDocument();
    });
  });

  it("pairs the heading text with its info icon", () => {
    render(<ValueSideHeading side="target" />);
    expect(screen.getByText("Target value")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "What is a target value?" }),
    ).toBeInTheDocument();
  });
});
