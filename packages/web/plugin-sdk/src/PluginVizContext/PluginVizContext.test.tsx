import {
  PluginVizProvider,
  usePluginVizContext,
} from "@plugin-sdk/PluginVizContext/PluginVizContext";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";

function _translateForChart(key: string): string {
  return `chart:${key}`;
}

function _wrapper({ children }: { children: ReactNode }): ReactNode {
  return (
    <PluginVizProvider vizId="epicurve" t={_translateForChart}>
      {children}
    </PluginVizProvider>
  );
}

describe("PluginVizProvider", () => {
  it("gives its children the chart type id it was given", () => {
    const { result } = renderHook(usePluginVizContext, { wrapper: _wrapper });
    expect(result.current?.vizId).toBe("epicurve");
  });

  it("gives its children the translator it was given", () => {
    const { result } = renderHook(usePluginVizContext, { wrapper: _wrapper });
    expect(result.current?.t).toBe(_translateForChart);
  });
});

describe("usePluginVizContext", () => {
  it("returns undefined outside a PluginVizProvider", () => {
    const { result } = renderHook(usePluginVizContext);
    expect(result.current).toBeUndefined();
  });
});
