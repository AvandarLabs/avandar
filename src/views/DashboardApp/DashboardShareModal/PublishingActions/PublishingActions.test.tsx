import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { PublishingActions } from "@/views/DashboardApp/DashboardShareModal/PublishingActions/PublishingActions";

const noop = vi.fn();

describe("PublishingActions", () => {
  it("labels the draft-to-workspace case as publishing to the workspace", () => {
    render(
      <PublishingActions
        actionKind="publish_workspace"
        isBusy={false}
        isBlockedReason={undefined}
        onPrimaryAction={noop}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Publish to workspace" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Publish to workspace" })
        .parentElement,
    ).toHaveAttribute("data-nux", "dashboard-publish-button");
  });

  it("labels a downgrade as making the dashboard internal", () => {
    render(
      <PublishingActions
        actionKind="make_internal"
        isBusy={false}
        isBlockedReason={undefined}
        onPrimaryAction={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Make internal" })).toBeEnabled();
  });

  it("disables the action when there is no audience selected", () => {
    render(
      <PublishingActions
        actionKind="disabled_no_audience"
        isBusy={false}
        isBlockedReason={undefined}
        onPrimaryAction={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });

  it("disables the action while there are unsaved changes", () => {
    // Publishing copies the PERSISTED config to the bucket, so publishing with
    // unsaved edits would ship the previous version without saying so.
    render(
      <PublishingActions
        actionKind="publish_public"
        isBusy={false}
        isBlockedReason="You cannot publish while there are unsaved changes. Save first."
        onPrimaryAction={noop}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Publish publicly" }),
    ).toBeDisabled();
  });
});
