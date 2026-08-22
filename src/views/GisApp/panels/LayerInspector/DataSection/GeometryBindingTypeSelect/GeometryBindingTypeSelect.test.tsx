/**
 * Geometry type select never offers buffer-of-layer as a binding choice.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "@/test-utils";
import {
  createBoundLayer,
  resetDataSectionFixtures,
} from "@/views/GisApp/panels/LayerInspector/DataSection/__tests__/DataSection.fixtures";
import { GeometryBindingTypeSelect } from "@/views/GisApp/panels/LayerInspector/DataSection/GeometryBindingTypeSelect/GeometryBindingTypeSelect";

beforeEach(() => {
  resetDataSectionFixtures();
});

describe("GeometryBindingTypeSelect", () => {
  it("does not offer bufferOfLayer as a geometry option", () => {
    render(
      <GeometryBindingTypeSelect
        layer={createBoundLayer()}
        sourceColumns={[]}
        boundaryOptions={[]}
        onLayerChange={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getAllByRole("combobox", { name: "Geometry" }).at(-1)!,
    );

    expect(
      screen.queryByRole("option", { name: /buffer/i, hidden: true }),
    ).not.toBeInTheDocument();
  });
});
