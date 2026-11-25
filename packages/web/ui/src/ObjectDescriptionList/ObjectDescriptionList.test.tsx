import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ObjectDescriptionList } from "./ObjectDescriptionList";

type Column = {
  id: string;
  name: string;
  description: string | undefined;
};

const COLUMNS: readonly Column[] = [
  { id: "1", name: "GENDER", description: undefined },
  { id: "2", name: "AGE", description: "Age in years" },
];

function renderList(ui: JSX.Element) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe("ObjectDescriptionList", () => {
  it("hands a table cell's renderValue the row it sits in", () => {
    renderList(
      <ObjectDescriptionList
        data={COLUMNS}
        renderAsTable
        itemRenderOptions={{
          includeKeys: ["name", "description"],
          keyRenderOptions: {
            description: {
              renderValue: (description, _rootData, column) => {
                return description ?? `No description for ${column.name}`;
              },
            },
          },
        }}
      />,
    );

    expect(screen.getByText("No description for GENDER")).toBeInTheDocument();
    expect(screen.getByText("Age in years")).toBeInTheDocument();
  });

  it("shows an editable table row's new values when its data changes", () => {
    const { rerender } = renderList(
      <ObjectDescriptionList
        data={COLUMNS}
        renderAsTable
        editable
        itemRenderOptions={{ includeKeys: ["name", "description"] }}
      />,
    );
    const updatedColumns = COLUMNS.map((column) => {
      return column.id === "2"
        ? { ...column, description: "Age at onset" }
        : column;
    });

    rerender(
      <MantineProvider>
        <ObjectDescriptionList
          data={updatedColumns}
          renderAsTable
          editable
          itemRenderOptions={{ includeKeys: ["name", "description"] }}
        />
      </MantineProvider>,
    );

    expect(screen.getByText("Age at onset")).toBeInTheDocument();
    expect(screen.queryByText("Age in years")).not.toBeInTheDocument();
  });

  it("hands a key's renderValue the object it belongs to", () => {
    renderList(
      <ObjectDescriptionList
        data={COLUMNS[0]!}
        keyRenderOptions={{
          description: {
            renderValue: (description, _rootData, column) => {
              return description ?? `No description for ${column.name}`;
            },
          },
        }}
      />,
    );

    expect(screen.getByText("No description for GENDER")).toBeInTheDocument();
  });
});
