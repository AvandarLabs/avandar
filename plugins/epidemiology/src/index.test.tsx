import { AvandarProvider } from "@avandar/plugin-sdk";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeEpicurveFromRows } from "./epicurve/makeEpicurveFromRows/makeEpicurveFromRows";
import plugin from "./index";
import { RatePlot } from "./ratePlot/RatePlot/RatePlot";
import type { AvandarApi, QueryHandle } from "@avandar/plugin-sdk";

function _makeApi(openModal: AvandarApi["ui"]["openModal"]): AvandarApi {
  return {
    context: {
      slotId: "dataExplorer.toolbar",
      queryHandle: "query-handle-1" as QueryHandle,
      columns: [
        { name: "age", dataType: "bigint" },
        { name: "weight", dataType: "double" },
      ],
      rowCount: 5,
    },
    workspace: { id: "workspace-1", slug: "workspace", locale: "en-US" },
    data: {
      fetchRows: vi.fn(() => {
        return Promise.resolve({ rows: [], isTruncated: false });
      }),
    },
    ui: {
      openModal,
      closeModal: vi.fn(),
      openDrawer: vi.fn(),
      notify: vi.fn(),
    },
    i18n: {
      t: (key) => {
        return `translated:${key}`;
      },
    },
  };
}

describe("the epidemiology plugin", () => {
  it("opens the linear regression modal under its translated title", () => {
    const openModal = vi.fn();
    const api = _makeApi(openModal);
    void plugin.commands["regression.linear"]?.(api);
    expect(openModal).toHaveBeenCalledTimes(1);
    const [options] = openModal.mock.calls[0] as Parameters<
      AvandarApi["ui"]["openModal"]
    >;
    expect(options.title).toBe("translated:regression.linear.title");
    render(
      <MantineProvider>
        <AvandarProvider api={api}>{options.content}</AvandarProvider>
      </MantineProvider>,
    );
    expect(
      screen.getByRole("button", { name: "translated:modal.fit" }),
    ).toBeInTheDocument();
  });

  it("draws the epicurve chart type with the epicurve transform", () => {
    expect(plugin.vizTypes.epicurve?.transform).toBe(makeEpicurveFromRows);
  });

  it("draws the rate-plot chart type with the RatePlot component", () => {
    expect(plugin.vizTypes["rate-plot"]?.Component).toBe(RatePlot);
  });
});
