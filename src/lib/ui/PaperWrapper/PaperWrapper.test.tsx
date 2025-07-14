import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PaperWrapper } from "./PaperWrapper";

describe("PaperWrapper", () => {
  it("renders children correctly", () => {
    render(
      <PaperWrapper>
        <p>Test content</p>
      </PaperWrapper>,
    );

    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("applies default props when none are provided", () => {
    const { container } = render(<PaperWrapper>Defaults</PaperWrapper>);
    const paperDiv = container.firstChild as HTMLElement;

    expect(paperDiv).toHaveClass("mantine-Paper-root"); // Mantine base class

    // You can check styles directly if needed
    expect(paperDiv).toHaveStyle({
      backgroundColor: "white",
    });
  });

  it("applies custom props", () => {
    const { container } = render(
      <PaperWrapper
        p="sm"
        mt="xl"
        radius="xl"
        shadow="lg"
        bg="gray"
        withBorder={false}
        className="custom-class"
      >
        Custom Props
      </PaperWrapper>,
    );

    const paperDiv = container.firstChild as HTMLElement;

    expect(paperDiv.className).toContain("custom-class");
    expect(screen.getByText("Custom Props")).toBeInTheDocument();
  });
});
