import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { PaperWrapper } from "../PaperWrapper";

describe("PaperWrapper", () => {
  it("renders children correctly", () => {
    render(
      <PaperWrapper>
        <div data-testid="inner">Hello world</div>
      </PaperWrapper>,
    );

    expect(screen.getByTestId("inner")).toBeInTheDocument();
  });

  it("uses default props when none are provided", () => {
    render(<PaperWrapper>Default test</PaperWrapper>);
    const paper = screen.getByText("Default test").parentElement;
    expect(paper).toBeInTheDocument();
  });

  it("applies radius correctly", () => {
    render(<PaperWrapper radius="lg">Radius test</PaperWrapper>);
    const paper = screen.getByText("Radius test").parentElement;
    expect(paper).toBeInTheDocument();
  });

  it("applies border when withBorder is true", () => {
    render(<PaperWrapper withBorder>Border test</PaperWrapper>);
    const paper = screen.getByText("Border test").parentElement;
    expect(paper).toBeInTheDocument();
  });

  it("applies padding when passed", () => {
    render(<PaperWrapper p="md">Padding test</PaperWrapper>);
    const paper = screen.getByText("Padding test").parentElement;
    expect(paper).toBeInTheDocument();
  });

  it("applies background and shadow correctly", () => {
    render(
      <PaperWrapper bg="gray" shadow="xl">
        Styled content
      </PaperWrapper>,
    );
    const paper = screen.getByText("Styled content").parentElement;
    expect(paper).toBeInTheDocument();
  });

  it("renders with multiple props and custom class", () => {
    render(
      <PaperWrapper className="combo" data-testid="wrapper">
        Combo test
      </PaperWrapper>,
    );
    const paper = screen.getByTestId("wrapper");
    expect(paper).toHaveClass("combo");
  });

  it("passes additional props through to the Paper component", () => {
    render(
      <PaperWrapper data-testid="passthrough">Passthrough test</PaperWrapper>,
    );
    expect(screen.getByTestId("passthrough")).toBeInTheDocument();
  });
});
