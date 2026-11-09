import { describe, expect, it, vi } from "vitest";
import { PluginVizPlaceholder } from "@/lib/plugins/vizs/PluginVizPlaceholder/PluginVizPlaceholder";
import { fireEvent, render, screen } from "@/test-utils";

describe("PluginVizPlaceholder", () => {
  it("names the plugin a missing plugin chart needs", () => {
    render(
      <PluginVizPlaceholder
        reason="missingPlugin"
        pluginId="avandar.epidemiology"
      />,
    );
    expect(screen.getByText("Plugin not available")).toBeInTheDocument();
    expect(screen.getByText(/avandar\.epidemiology/)).toBeInTheDocument();
  });

  it("titles invalid settings as invalid chart settings", () => {
    render(
      <PluginVizPlaceholder
        reason="invalidSettings"
        pluginId="avandar.epidemiology"
      />,
    );
    expect(screen.getByText("Invalid chart settings")).toBeInTheDocument();
  });

  it("puts the chart title in the render failure heading", () => {
    render(
      <PluginVizPlaceholder
        reason="renderFailed"
        pluginId="avandar.epidemiology"
        title="Epicurve"
      />,
    );
    expect(screen.getByText("Epicurve couldn't render")).toBeInTheDocument();
  });

  it("calls onRetry when Retry is clicked after a failed load", () => {
    const onRetry = vi.fn();
    render(
      <PluginVizPlaceholder
        reason="loadFailed"
        pluginId="avandar.epidemiology"
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows no Retry button for a missing plugin", () => {
    render(
      <PluginVizPlaceholder
        reason="missingPlugin"
        pluginId="avandar.epidemiology"
        onRetry={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument();
  });
});
