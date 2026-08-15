import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
import { PublishDashboardStatus } from "@/views/DashboardApp/DashboardShareModal/PublishDashboardStatus/PublishDashboardStatus";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

const MANTINE_RED_6 = "#f03e3e";

function renderStatus(
  visibility: Dashboard.Visibility,
  targetVisibility: Dashboard.Visibility,
): void {
  render(
    <PublishDashboardStatus
      visibility={visibility}
      targetVisibility={targetVisibility}
      isUsingVanity={false}
      targetUrl="https://app.example.com/d/dash-1"
    />,
  );
}

describe("PublishDashboardStatus", () => {
  it("shows no divergence alert while a draft still targets draft", () => {
    renderStatus("draft", "draft");

    expect(screen.getByText(/Not published yet/)).toBeInTheDocument();
    expect(screen.queryByText(/Use the button below/)).toBeNull();
  });

  it("shows no divergence alert while a published dashboard keeps its audience", () => {
    renderStatus("workspace", "workspace");

    expect(screen.getByText(/published to your workspace/)).toBeInTheDocument();
    expect(screen.queryByText(/Use the button below/)).toBeNull();
  });

  it("never claims a draft has a stale published copy", () => {
    // The blue "Not published yet" alert renders directly above this one, so
    // wording about a published copy would contradict it in adjacent lines.
    renderStatus("draft", "workspace");

    expect(
      screen.getByText(/not published yet. Use the button below to publish it/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/published copy/)).toBeNull();
  });

  it("warns in red that a dashboard being narrowed is still live on the web", () => {
    // The dropdown already reads "Restricted" at this point while `is_public`
    // is still true. Without this alert the user can close the modal believing
    // they locked the dashboard down.
    renderStatus("public", "workspace");

    const alert = screen
      .getByText(/still public on the web/)
      .closest("div[class*='Alert-root']");
    expect(alert).not.toBeNull();
    // Mantine resolves `color="red"` to red-6 in the inline custom property.
    // The neutral yellow used for every other divergence must not appear here:
    // this case is a live exposure, not a tidy pending change.
    expect(alert?.getAttribute("style")).toContain(
      `--alert-color: ${MANTINE_RED_6}`,
    );
    expect(screen.queryByText(/published copy still serves/)).toBeNull();
  });
});
