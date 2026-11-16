import {
  AvandarProvider,
  useAvandar,
  useT,
} from "@plugin-sdk/AvandarContext/AvandarContext";
import { PluginError } from "@plugin-sdk/PluginError/PluginError";
import { PluginVizProvider } from "@plugin-sdk/PluginVizContext/PluginVizContext";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AvandarApi } from "@plugin-sdk/PluginApi.types";
import type { ReactNode } from "react";

const API = {
  i18n: {
    t: (key: string) => {
      return `t:${key}`;
    },
  },
} as unknown as AvandarApi;

function _translateForChart(key: string): string {
  return `chart:${key}`;
}

function _wrapper({ children }: { children: ReactNode }): ReactNode {
  return <AvandarProvider api={API}>{children}</AvandarProvider>;
}

function _chartWrapper({ children }: { children: ReactNode }): ReactNode {
  return (
    <PluginVizProvider vizId="epicurve" t={_translateForChart}>
      {children}
    </PluginVizProvider>
  );
}

function _chartInPluginUiWrapper({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <AvandarProvider api={API}>
      <PluginVizProvider vizId="epicurve" t={_translateForChart}>
        {children}
      </PluginVizProvider>
    </AvandarProvider>
  );
}

describe("useAvandar", () => {
  it("returns the API inside an AvandarProvider", () => {
    const { result } = renderHook(useAvandar, { wrapper: _wrapper });
    expect(result.current).toBe(API);
  });

  describe("outside an AvandarProvider", () => {
    beforeEach(() => {
      // React logs the error a component throws while rendering.
      vi.spyOn(console, "error").mockImplementation(() => {
        return undefined;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("throws a PluginError", () => {
      expect(() => {
        return renderHook(useAvandar);
      }).toThrow(PluginError);
    });

    it("throws with the CommandFailed code", () => {
      expect(() => {
        return renderHook(useAvandar);
      }).toThrow(expect.objectContaining({ code: "CommandFailed" }));
    });

    it("throws a message that says where the hook can be used", () => {
      expect(() => {
        return renderHook(useAvandar);
      }).toThrow(/inside plugin UI/);
    });
  });

  describe("inside a plugin chart", () => {
    beforeEach(() => {
      // React logs the error a component throws while rendering.
      vi.spyOn(console, "error").mockImplementation(() => {
        return undefined;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("throws with the CommandFailed code", () => {
      expect(() => {
        return renderHook(useAvandar, { wrapper: _chartWrapper });
      }).toThrow(expect.objectContaining({ code: "CommandFailed" }));
    });

    it("throws a message that names the chart type", () => {
      expect(() => {
        return renderHook(useAvandar, { wrapper: _chartWrapper });
      }).toThrow(
        'useAvandar() is not available inside the "epicurve" chart. Use useT() for strings.',
      );
    });
  });

  it("exposes the plugin translator through useT", () => {
    const { result } = renderHook(useT, { wrapper: _wrapper });
    expect(result.current("hello")).toBe("t:hello");
  });
});

describe("useT", () => {
  it("returns the chart translator inside a PluginVizProvider", () => {
    const { result } = renderHook(useT, { wrapper: _chartWrapper });
    expect(result.current("hello")).toBe("chart:hello");
  });

  it("returns the plugin UI translator for a chart inside plugin UI", () => {
    const { result } = renderHook(useT, { wrapper: _chartInPluginUiWrapper });
    expect(result.current("hello")).toBe("t:hello");
  });

  describe("outside both providers", () => {
    beforeEach(() => {
      // React logs the error a component throws while rendering.
      vi.spyOn(console, "error").mockImplementation(() => {
        return undefined;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("throws a PluginError", () => {
      expect(() => {
        return renderHook(useT);
      }).toThrow(PluginError);
    });
  });
});
