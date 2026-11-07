import {
  AvandarProvider,
  useAvandar,
  useT,
} from "@plugin-sdk/AvandarContext/AvandarContext";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

  it("throws outside plugin UI", () => {
    expect(() => {
      return renderHook(useAvandar);
    }).toThrow(/inside plugin UI/);
  });

  it("exposes the plugin translator through useT", () => {
    const { result } = renderHook(useT, { wrapper: _wrapper });
    expect(result.current("hello")).toBe("t:hello");
  });
});
