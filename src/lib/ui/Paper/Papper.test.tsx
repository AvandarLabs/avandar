import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { Paper } from "./index";

describe("PaperWrapper", () => {
  it("renders children correctly", () => {
    render(
      <Paper>
        <div data-testid="inner">Hello world</div>
      </Paper>,
    );

    expect(screen.getByTestId("inner")).toBeInTheDocument();
  });

  it("applies radius correctly", () => {
    render(<Paper radius="lg">Radius test</Paper>);
    const paper = screen.getByText("Radius test");
    expect(paper).toHaveStyle({
      "--paper-radius": "var(--mantine-radius-lg)",
    });
  });

  it("applies border when withBorder is true", () => {
    render(<Paper withBorder>Border test</Paper>);
    const paper = screen.getByText("Border test");
    expect(paper).toHaveAttribute("data-with-border", "true");
  });

  it("applies padding when passed", () => {
    render(<Paper p="md">Padding test</Paper>);
    const paper = screen.getByText("Padding test");
    expect(paper).toHaveStyle({ padding: "var(--mantine-spacing-md)" });
  });

  it("applies background and shadow correctly", () => {
    render(
      <Paper bg="gray" shadow="xl">
        Styled content
      </Paper>,
    );
    const paper = screen.getByText("Styled content");
    expect(paper).toHaveStyle({ "--paper-shadow": "var(--mantine-shadow-xl)" });
  });

  it("renders with multiple props and custom class", () => {
    render(
      <Paper className="combo" data-testid="wrapper">
        Combo test
      </Paper>,
    );
    const paper = screen.getByTestId("wrapper");
    expect(paper).toHaveClass("combo");
  });

  it("passes additional props through to the Paper component", () => {
    render(<Paper data-testid="passthrough">Passthrough test</Paper>);
    expect(screen.getByTestId("passthrough")).toBeInTheDocument();
  });
});
