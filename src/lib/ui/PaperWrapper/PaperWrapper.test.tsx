import { describe, expect, it } from "vitest";
import { renderWithMantine, screen } from "../../utils/renderWithMantine";
import { PaperWrapper } from "../PaperWrapper";

describe("PaperWrapper", () => {
  it("renders children correctly", () => {
    renderWithMantine(
      <PaperWrapper>
        <div data-testid="inner">Hello world</div>
      </PaperWrapper>,
    );

    expect(screen.getByTestId("inner")).toBeInTheDocument();
  });

  it("applies radius correctly", () => {
    renderWithMantine(<PaperWrapper radius="lg">Radius test</PaperWrapper>);
    const paper = screen.getByText("Radius test").parentElement;
    expect(paper).toBeInTheDocument();
  });

  it("applies border when withBorder is true", () => {
    renderWithMantine(<PaperWrapper withBorder>Border test</PaperWrapper>);
    const paper = screen.getByText("Border test").parentElement;
    expect(paper).toBeInTheDocument();
  });

  it("applies padding when passed", () => {
    renderWithMantine(<PaperWrapper p="md">Padding test</PaperWrapper>);
    const paper = screen.getByText("Padding test").parentElement;
    expect(paper).toBeInTheDocument();
  });

  it("renders with multiple props", () => {
    renderWithMantine(
      <PaperWrapper className="combo" data-testid="wrapper">
        Combo test
      </PaperWrapper>,
    );

    const paper = screen.getByTestId("wrapper");
    expect(paper).toHaveClass("combo");
  });
});
