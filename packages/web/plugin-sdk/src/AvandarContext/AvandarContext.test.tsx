import {
  AvandarProvider,
  useAvandar,
  useT,
} from "@plugin-sdk/AvandarContext/AvandarContext";
import { PluginError } from "@plugin-sdk/PluginError/PluginError";
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

function _wrapper({ children }: { children: ReactNode }): ReactNode {
  return <AvandarProvider api={API}>{children}</AvandarProvider>;
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

  it("exposes the plugin translator through useT", () => {
    const { result } = renderHook(useT, { wrapper: _wrapper });
    expect(result.current("hello")).toBe("t:hello");
  });
});
