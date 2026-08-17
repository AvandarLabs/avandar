import { ModalsProvider } from "@mantine/modals";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_MODAL_PROPS } from "@/config/Theme";
import { fireEvent, render, screen } from "@/test-utils";
import { PublishDashboardStatus } from "@/views/DashboardApp/DashboardShareModal/PublishDashboardStatus/PublishDashboardStatus";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactElement } from "react";

const MANTINE_RED_6 = "#f03e3e";
// Mantine darkens yellow for the light variant's foreground, so
// `color="yellow"` resolves to yellow-7, not the yellow-6 of the palette.
const MANTINE_YELLOW_LIGHT = "#f59f00";
const PATH_PREFIX = "https://app.example.com/d/";

type VanitySlug = {
  slugInput: string;
  normalisedSlug: string;
  errorMessage?: string;
  hasPendingCheck: boolean;
  isAccepted: boolean;
  onChange: (slugInput: string) => void;
};

function _makeVanitySlug(overrides: Partial<VanitySlug> = {}): VanitySlug {
  return {
    slugInput: "first-dash",
    normalisedSlug: "first-dash",
    hasPendingCheck: false,
    isAccepted: true,
    onChange: vi.fn(),
    ...overrides,
  };
}

function renderStatus(
  visibility: Dashboard.Visibility,
  targetVisibility: Dashboard.Visibility,
  options: {
    isUsingVanity?: boolean;
    vanitySlug?: VanitySlug;
  } = {},
): void {
  render(
    <PublishDashboardStatus
      visibility={visibility}
      targetVisibility={targetVisibility}
      isUsingVanity={options.isUsingVanity ?? false}
      targetUrl={`${PATH_PREFIX}dash-1`}
      pathPrefix={PATH_PREFIX}
      vanitySlug={options.vanitySlug}
    />,
  );
}

function renderPublishedWithLiveSlug(vanitySlug: VanitySlug): void {
  function Harness(): ReactElement {
    const [slugInput, setSlugInput] = useState(vanitySlug.slugInput);
    return (
      <PublishDashboardStatus
        visibility="workspace"
        targetVisibility="workspace"
        isUsingVanity={slugInput !== ""}
        targetUrl={`${PATH_PREFIX}${slugInput || "dash-1"}`}
        pathPrefix={PATH_PREFIX}
        vanitySlug={{
          ...vanitySlug,
          slugInput,
          normalisedSlug: slugInput,
          onChange: (nextSlug) => {
            vanitySlug.onChange(nextSlug);
            setSlugInput(nextSlug);
          },
        }}
      />
    );
  }
  render(
    <ModalsProvider modalProps={DEFAULT_MODAL_PROPS}>
      <Harness />
    </ModalsProvider>,
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

  it("warns in yellow that a widened dashboard still serves its old audience", () => {
    // The published snapshot only moves when the footer button is pressed, so
    // a workspace dashboard whose owner picked "Anyone with the link" is still
    // workspace-only. Telling this owner it is "not published yet" would be
    // wrong: a published copy exists, it just serves the previous audience.
    renderStatus("workspace", "public");

    const alert = screen
      .getByText(/The published copy still serves the previous audience/)
      .closest("div[class*='Alert-root']");
    expect(alert).not.toBeNull();
    // Yellow, not the red reserved for a live public exposure being narrowed:
    // widening a workspace dashboard leaks nothing until the button is pressed.
    expect(alert?.getAttribute("style")).toContain(
      `--alert-color: ${MANTINE_YELLOW_LIGHT}`,
    );
    expect(alert?.getAttribute("style")).not.toContain(MANTINE_RED_6);
    expect(screen.queryByText(/not published yet/i)).toBeNull();
  });

  it("does not show copy or QR actions before the dashboard is published", () => {
    renderStatus("draft", "workspace");

    expect(
      screen.queryByRole("button", { name: "Copy share link" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Show QR code" })).toBeNull();
  });

  it("shows copy and QR actions on the published URL", () => {
    renderStatus("workspace", "workspace", {
      vanitySlug: _makeVanitySlug(),
    });

    expect(
      screen.getByRole("button", { name: "Copy share link" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show QR code" }),
    ).toBeInTheDocument();
  });

  it("does not point at a UUID link below the published URL", () => {
    renderStatus("workspace", "workspace", { isUsingVanity: true });

    expect(screen.getByText(/Using your custom URL/)).toBeInTheDocument();
    expect(screen.queryByText(/direct UUID link below/)).toBeNull();
  });

  it("does not offer Change URL before the dashboard is published", () => {
    renderStatus("draft", "workspace");

    expect(screen.queryByRole("button", { name: "Change URL" })).toBeNull();
  });

  it("places Change URL to the left of copy on a published URL", () => {
    renderStatus("workspace", "workspace", {
      vanitySlug: _makeVanitySlug(),
    });

    const changeUrl = screen.getByRole("button", { name: "Change URL" });
    const copy = screen.getByRole("button", { name: "Copy share link" });
    expect(
      changeUrl.compareDocumentPosition(copy) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("opens the custom URL field with the site prefix when Change URL is clicked", () => {
    renderStatus("workspace", "workspace", {
      vanitySlug: _makeVanitySlug(),
    });

    fireEvent.click(screen.getByRole("button", { name: "Change URL" }));

    expect(
      screen.getByRole("textbox", { name: "Custom URL path" }),
    ).toHaveValue("first-dash");
    expect(screen.getByText(PATH_PREFIX)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save URL" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel URL change" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Change URL" })).toBeNull();
  });

  it("restores the previous slug when the URL change is cancelled", () => {
    const onChange = vi.fn();
    renderStatus("workspace", "workspace", {
      vanitySlug: _makeVanitySlug({ onChange }),
    });

    fireEvent.click(screen.getByRole("button", { name: "Change URL" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Custom URL path" }), {
      target: { value: "new-slug" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel URL change" }));

    expect(onChange).toHaveBeenCalledWith("first-dash");
    expect(
      screen.queryByRole("textbox", { name: "Custom URL path" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Change URL" }),
    ).toBeInTheDocument();
  });

  it("keeps the typed slug when the URL change is saved", async () => {
    const onChange = vi.fn();
    renderPublishedWithLiveSlug(_makeVanitySlug({ onChange }));

    fireEvent.click(screen.getByRole("button", { name: "Change URL" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Custom URL path" }), {
      target: { value: "new-slug" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save URL" }));
    fireEvent.click(
      await screen.findByRole("button", { name: /^Replace URL$/ }),
    );

    expect(onChange).toHaveBeenCalledWith("new-slug");
    expect(onChange).not.toHaveBeenCalledWith("first-dash");
    expect(
      screen.queryByRole("textbox", { name: "Custom URL path" }),
    ).toBeNull();
  });

  it("does not save while the custom URL is still being checked", () => {
    renderStatus("workspace", "workspace", {
      vanitySlug: _makeVanitySlug({
        hasPendingCheck: true,
        isAccepted: false,
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: "Change URL" }));

    expect(screen.getByRole("button", { name: "Save URL" })).toBeDisabled();
  });

  it("does not warn when saving a custom URL for the first time", () => {
    renderPublishedWithLiveSlug(
      _makeVanitySlug({ slugInput: "", normalisedSlug: "" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Change URL" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Custom URL path" }), {
      target: { value: "first-dash" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save URL" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.queryByRole("textbox", { name: "Custom URL path" }),
    ).toBeNull();
  });

  it("warns before replacing an existing custom URL and waits for confirm", async () => {
    renderPublishedWithLiveSlug(_makeVanitySlug());

    fireEvent.click(screen.getByRole("button", { name: "Change URL" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Custom URL path" }), {
      target: { value: "second-dash" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save URL" }));

    const confirmDialog = await screen.findByRole("dialog");
    expect(confirmDialog).toHaveTextContent(
      /previous URL will become invalid and unreachable/i,
    );
    expect(
      screen.getByRole("textbox", { name: "Custom URL path" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Replace URL$/ }));

    expect(
      screen.queryByRole("textbox", { name: "Custom URL path" }),
    ).toBeNull();
  });
});
