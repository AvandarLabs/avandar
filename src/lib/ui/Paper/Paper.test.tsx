import { describe, expect, it } from "vitest";
import { render, screen } from "@/utils/testingUtils";
import { Paper } from "./index";

describe("Paper", () => {
  it("renders without crashing", () => {
    render(<Paper data-testid="paper-element" />);
    expect(screen.getByTestId("paper-element")).toBeInTheDocument();
  });

  it("applies radius correctly", () => {
    render(<Paper data-testid="radius-test" radius="lg" />);
    const paper = screen.getByTestId("radius-test");
    expect(paper).toHaveStyle({
      "--paper-radius": "var(--mantine-radius-lg)",
    });
  });

  it("applies border when withBorder is true", () => {
    render(<Paper data-testid="border-test" withBorder />);
    const paper = screen.getByTestId("border-test");
    expect(paper).toHaveAttribute("data-with-border", "true");
  });

  it("applies padding when passed", () => {
    render(<Paper data-testid="padding-test" p="md" />);
    const paper = screen.getByTestId("padding-test");
    expect(paper).toHaveStyle({ padding: "var(--mantine-spacing-md)" });
  });

  it("applies background and shadow correctly", () => {
    render(<Paper data-testid="style-test" bg="gray" shadow="xl" />);
    const paper = screen.getByTestId("style-test");
    expect(paper).toHaveStyle({
      "--paper-shadow": "var(--mantine-shadow-xl)",
    });
  });

  it("renders with custom className", () => {
    render(<Paper className="custom-class" data-testid="custom-class-test" />);
    const paper = screen.getByTestId("custom-class-test");
    expect(paper).toHaveClass("custom-class");
  });

  it("passes arbitrary props through to the Paper element", () => {
    render(<Paper aria-label="test-label" data-testid="passthrough" />);
    const paper = screen.getByTestId("passthrough");
    expect(paper).toHaveAttribute("aria-label", "test-label");
  });
});
