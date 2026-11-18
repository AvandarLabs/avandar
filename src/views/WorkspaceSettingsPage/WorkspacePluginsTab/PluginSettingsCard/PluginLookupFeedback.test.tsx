import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { PluginLookupFeedback } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginLookupFeedback";
import type { LookupState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/useLookupState/useLookupState";

function _buildFeedback(
  state: LookupState,
  onRetry: () => void = vi.fn(),
): JSX.Element {
  return (
    <>
      <h5 id="plugin-heading">Epidemiology</h5>
      <PluginLookupFeedback
        state={state}
        message="We could not load it."
        retryingMessage="Loading it again."
        recoveredMessage="It loaded."
        onRetry={onRetry}
        describedById="plugin-heading"
      />
    </>
  );
}

describe("PluginLookupFeedback", () => {
  it("shows no alert and announces nothing when the lookup is fine", () => {
    render(_buildFeedback("ok"));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("shows the message in an alert with an enabled Retry once failed", () => {
    render(_buildFeedback("failed"));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We could not load it.",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
  });

  it("ties Retry to the thing it belongs to", () => {
    render(_buildFeedback("failed"));

    expect(screen.getByRole("button", { name: "Retry" })).toHaveAccessibleDescription(
      "Epidemiology",
    );
  });

  it("keeps the alert, shows Retry loading and announces the retry while retrying", () => {
    render(_buildFeedback("retrying"));

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Retry" })).toHaveAttribute(
      "data-loading",
      "true",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Loading it again.");
  });

  it("asks to retry and moves focus to the status, which outlives the button", () => {
    const onRetry = vi.fn();
    render(_buildFeedback("failed", onRetry));

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveFocus();
  });

  it("announces the failure again when a retry fails", () => {
    const { rerender } = render(_buildFeedback("failed"));
    rerender(_buildFeedback("retrying"));

    rerender(_buildFeedback("failed"));

    expect(screen.getByRole("status")).toHaveTextContent(
      "We could not load it.",
    );
  });

  it("announces nothing on the first failure, since the alert announces it", () => {
    render(_buildFeedback("failed"));

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("removes the alert and announces the recovery once a retry succeeds", () => {
    const { rerender } = render(_buildFeedback("failed"));
    rerender(_buildFeedback("retrying"));

    rerender(_buildFeedback("ok"));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("It loaded.");
  });

  it("announces no recovery when it was never in error", () => {
    const { rerender } = render(_buildFeedback("ok"));

    rerender(_buildFeedback("ok"));

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
