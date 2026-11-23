import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tabs } from "./Tabs";

// jsdom has no layout. Inspect the indicator's target rather than its geometry.
vi.mock("@mantine/core", async (importOriginal) => {
  const mantine = await importOriginal<typeof import("@mantine/core")>();
  return {
    ...mantine,
    FloatingIndicator: ({ target }: { target: HTMLElement | null }) => {
      return (
        <output data-testid="indicator-target">{target?.textContent}</output>
      );
    },
  };
});

describe("Tabs", () => {
  it("measures a newly added controlled active tab", () => {
    const { rerender } = render(
      <MantineProvider>
        <Tabs
          tabIds={["one"]}
          value="one"
          renderTabHeader={(id) => {
            return id;
          }}
          renderTabPanel={(id) => {
            return id;
          }}
        />
      </MantineProvider>,
    );
    rerender(
      <MantineProvider>
        <Tabs
          tabIds={["one", "two"]}
          value="two"
          renderTabHeader={(id) => {
            return id;
          }}
          renderTabPanel={(id) => {
            return id;
          }}
        />
      </MantineProvider>,
    );
    expect(screen.getByTestId("indicator-target")).toHaveTextContent("two");
  });
});
