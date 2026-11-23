import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PrimitiveValueItem } from "./PrimitiveValueItem";

describe("PrimitiveValueItem", () => {
  it("uses type inference when a custom display renderer returns undefined", () => {
    render(
      <MantineProvider>
        <PrimitiveValueItem
          value={1234}
          renderValue={() => {
            return undefined;
          }}
        />
      </MantineProvider>,
    );
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("converts explicitly numeric strings to formatted numbers", () => {
    render(
      <MantineProvider>
        <PrimitiveValueItem value="1234" renderAsType="number" />
      </MantineProvider>,
    );
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("uses the custom editable renderer before any explicit conversion", () => {
    render(
      <MantineProvider>
        <PrimitiveValueItem
          editMode
          value={true}
          renderAsType="date"
          renderEditableValue={() => {
            return "Custom editor";
          }}
        />
      </MantineProvider>,
    );
    expect(screen.getByText("Custom editor")).toBeInTheDocument();
  });

  it("shows the invalid-date label for a boolean explicitly rendered as a date", () => {
    render(
      <MantineProvider>
        <PrimitiveValueItem value={false} renderAsType="date" />
      </MantineProvider>,
    );
    expect(screen.getByText("Invalid date")).toBeInTheDocument();
  });
});
