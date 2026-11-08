import { createTheme, MantineProvider } from "@mantine/core";
import { useChartTheme } from "@plugin-ui/useChartTheme/useChartTheme";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MantineColorsTuple } from "@mantine/core";
import type { ReactNode } from "react";

const CUSTOM_BLUE: MantineColorsTuple = [
  "#e7f0ff",
  "#cfe0ff",
  "#a0c1ff",
  "#6d9fff",
  "#4282ff",
  "#2770ff",
  "#1466ff",
  "#0055e4",
  "#004bcc",
  "#0040b4",
];

const CUSTOM_THEME = createTheme({ colors: { blue: CUSTOM_BLUE } });

function _lightWrapper({ children }: { children: ReactNode }): ReactNode {
  return <MantineProvider forceColorScheme="light">{children}</MantineProvider>;
}

function _darkWrapper({ children }: { children: ReactNode }): ReactNode {
  return <MantineProvider forceColorScheme="dark">{children}</MantineProvider>;
}

function _customThemeWrapper({ children }: { children: ReactNode }): ReactNode {
  return (
    <MantineProvider theme={CUSTOM_THEME} forceColorScheme="light">
      {children}
    </MantineProvider>
  );
}

describe("useChartTheme", () => {
  it("lists the built-in chart series colors in order under the default theme", () => {
    const { result } = renderHook(useChartTheme, { wrapper: _lightWrapper });
    expect(result.current.colors).toEqual([
      "#228be6",
      "#12b886",
      "#fab005",
      "#fd7e14",
      "#fa5252",
      "#be4bdb",
      "#4c6ef5",
      "#15aabf",
      "#40c057",
      "#e64980",
    ]);
  });

  it("takes the series colors from the theme it renders in", () => {
    const { result } = renderHook(useChartTheme, {
      wrapper: _customThemeWrapper,
    });
    expect(result.current.colors[0]).toBe("#1466ff");
  });

  it("returns the Mantine charts text color for light mode", () => {
    const { result } = renderHook(useChartTheme, { wrapper: _lightWrapper });
    expect(result.current.textColor).toBe("#495057");
  });

  it("returns the Mantine charts text color for dark mode", () => {
    const { result } = renderHook(useChartTheme, { wrapper: _darkWrapper });
    expect(result.current.textColor).toBe("#b8b8b8");
  });

  it("returns the Mantine charts grid color for light mode", () => {
    const { result } = renderHook(useChartTheme, { wrapper: _lightWrapper });
    expect(result.current.gridColor).toBe("rgba(173, 181, 189, 0.6)");
  });

  it("returns the Mantine charts grid color for dark mode", () => {
    const { result } = renderHook(useChartTheme, { wrapper: _darkWrapper });
    expect(result.current.gridColor).toBe("rgba(105, 105, 105, 0.6)");
  });
});
