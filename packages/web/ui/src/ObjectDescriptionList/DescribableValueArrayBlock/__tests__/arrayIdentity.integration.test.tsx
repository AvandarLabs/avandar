import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ObjectArrayBlock } from "../ObjectArrayBlock/ObjectArrayBlock";
import { PrimitiveFieldValueArrayBlock } from "../PrimitiveFieldValueArrayBlock";

const first = { name: "First" };
const second = { name: "Second" };

describe("description array identity", () => {
  it("keeps object table values with their objects after reordering without IDs", () => {
    const { rerender } = render(
      <MantineProvider>
        <ObjectArrayBlock
          values={[first, second]}
          rootData={[]}
          renderAsTable
        />
      </MantineProvider>,
    );
    rerender(
      <MantineProvider>
        <ObjectArrayBlock
          values={[second, first]}
          rootData={[]}
          renderAsTable
        />
      </MantineProvider>,
    );
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]!).getByText("Second")).toBeInTheDocument();
    expect(within(rows[2]!).getByText("First")).toBeInTheDocument();
  });

  it("keeps the expanded object with its label after reordering without IDs", () => {
    const { rerender } = render(
      <MantineProvider>
        <ObjectArrayBlock
          values={[first, second]}
          rootData={[]}
          titleKey="name"
        />
      </MantineProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "First" }));
    const expandedLabel = screen
      .getByRole("button", { name: "First" })
      .querySelector("span");
    rerender(
      <MantineProvider>
        <ObjectArrayBlock
          values={[second, first]}
          rootData={[]}
          titleKey="name"
        />
      </MantineProvider>,
    );
    expect(
      screen.getByRole("button", { name: "First" }).querySelector("span"),
    ).toBe(expandedLabel);
  });

  it("keeps uncontrolled primitive inputs with their values after reordering", () => {
    const { rerender } = render(
      <MantineProvider>
        <PrimitiveFieldValueArrayBlock
          values={["first", "second"]}
          rootData={[]}
          renderValue={(value) => {
            return <input aria-label={value} defaultValue={value} />;
          }}
        />
      </MantineProvider>,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "first" }), {
      target: { value: "edited" },
    });
    rerender(
      <MantineProvider>
        <PrimitiveFieldValueArrayBlock
          values={["second", "first"]}
          rootData={[]}
          renderValue={(value) => {
            return <input aria-label={value} defaultValue={value} />;
          }}
        />
      </MantineProvider>,
    );
    expect(screen.getByRole("textbox", { name: "first" })).toHaveValue(
      "edited",
    );
    expect(screen.getByRole("textbox", { name: "second" })).toHaveValue(
      "second",
    );
  });

  it.each([
    {
      kind: "millisecond-precision date",
      firstValue: new Date("2026-11-20T10:00:00.001Z"),
      secondValue: new Date("2026-11-20T10:00:00.002Z"),
    },
    { kind: "signed zero", firstValue: -0, secondValue: 0 },
  ])(
    "keeps edited $kind inputs with their values after reordering",
    ({ firstValue, secondValue }) => {
      const buildLabel = (value: Date | number) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return Object.is(value, -0) ? "-0" : String(value);
      };
      const renderValue = (value: Date | number) => {
        return (
          <input
            aria-label={buildLabel(value)}
            defaultValue={buildLabel(value)}
          />
        );
      };
      const { rerender } = render(
        <MantineProvider>
          <PrimitiveFieldValueArrayBlock
            values={[firstValue, secondValue]}
            rootData={[]}
            renderValue={renderValue}
          />
        </MantineProvider>,
      );
      fireEvent.change(
        screen.getByRole("textbox", { name: buildLabel(firstValue) }),
        { target: { value: "edited" } },
      );
      rerender(
        <MantineProvider>
          <PrimitiveFieldValueArrayBlock
            values={[secondValue, firstValue]}
            rootData={[]}
            renderValue={renderValue}
          />
        </MantineProvider>,
      );
      expect(
        screen.getByRole("textbox", { name: buildLabel(firstValue) }),
      ).toHaveValue("edited");
      expect(
        screen.getByRole("textbox", { name: buildLabel(secondValue) }),
      ).toHaveValue(buildLabel(secondValue));
    },
  );
});
