import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { PluginDetails } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetails";
import type {
  PluginLocaleMessages,
  PluginManifest,
} from "@avandar/plugin-manifest/runtime";

const STRINGS: PluginLocaleMessages = {
  en: {
    "regression.linear.title": "Linear regression",
    "viz.epicurve.title": "Epicurve",
    "viz.ratePlot.title": "Rate plot",
  },
};

function _makeManifest(options: {
  hasToolbarCommand: boolean;
  hasChartTypes: boolean;
  permissions: string[];
}): PluginManifest {
  const { hasToolbarCommand, hasChartTypes, permissions } = options;
  return {
    id: "avandar.epidemiology",
    permissions,
    contributes: {
      commands: [
        {
          id: "regression.linear",
          title: "%regression.linear.title%",
          icon: "trending-up",
        },
      ],
      menus: hasToolbarCommand
        ? { "dataExplorer.toolbar": [{ command: "regression.linear" }] }
        : {},
      vizTypes: hasChartTypes
        ? [
            { id: "epicurve", title: "%viz.epicurve.title%" },
            { id: "rate-plot", title: "%viz.ratePlot.title%" },
          ]
        : [],
    },
  } as unknown as PluginManifest;
}

const EPIDEMIOLOGY_MANIFEST = _makeManifest({
  hasToolbarCommand: true,
  hasChartTypes: true,
  permissions: ["data:context"],
});

const EMPTY_MANIFEST = _makeManifest({
  hasToolbarCommand: false,
  hasChartTypes: false,
  permissions: [],
});

function _renderDetails(manifest: PluginManifest): void {
  render(
    <>
      <h5 id="plugin-heading">Epidemiology</h5>
      <PluginDetails
        manifest={manifest}
        strings={STRINGS}
        headingId="plugin-heading"
      />
    </>,
  );
}

async function _renderExpandedDetails(manifest: PluginManifest): Promise<void> {
  _renderDetails(manifest);
  fireEvent.click(screen.getByRole("button", { name: "See more" }));
  await screen.findByRole("heading", { name: "What it adds" });
}

describe("PluginDetails", () => {
  it("starts collapsed, with a See more button that reports it is collapsed", () => {
    _renderDetails(EPIDEMIOLOGY_MANIFEST);

    expect(screen.getByRole("button", { name: "See more" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(
      screen.queryByRole("heading", { name: "What it adds" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Data it can read" }),
    ).not.toBeInTheDocument();
  });

  it("shows both sections and a See less button that reports it is expanded once See more is pressed", async () => {
    await _renderExpandedDetails(EPIDEMIOLOGY_MANIFEST);

    expect(
      screen.getByRole("heading", { name: "Data it can read" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "See less" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("points the collapsed toggle at an element that exists", () => {
    _renderDetails(EPIDEMIOLOGY_MANIFEST);

    const regionId = screen
      .getByRole("button", { name: "See more" })
      .getAttribute("aria-controls");
    expect(regionId).toBeTruthy();
    expect(document.getElementById(regionId ?? "")).toBeInTheDocument();
  });

  it("points the toggle at the region holding the details", async () => {
    await _renderExpandedDetails(EPIDEMIOLOGY_MANIFEST);

    const regionId = screen
      .getByRole("button", { name: "See less" })
      .getAttribute("aria-controls");
    const region = document.getElementById(regionId ?? "");
    expect(region).toContainElement(
      screen.getByRole("heading", { name: "What it adds" }),
    );
  });

  it("names the plugin as the toggle's description", () => {
    _renderDetails(EPIDEMIOLOGY_MANIFEST);

    expect(
      screen.getByRole("button", { name: "See more" }),
    ).toHaveAccessibleDescription("Epidemiology");
  });

  it("lists the Data Explorer toolbar command by its localized title", async () => {
    await _renderExpandedDetails(EPIDEMIOLOGY_MANIFEST);

    expect(
      screen.getByText("Data Explorer toolbar: Linear regression"),
    ).toBeInTheDocument();
  });

  it("lists both chart types by their localized titles", async () => {
    await _renderExpandedDetails(EPIDEMIOLOGY_MANIFEST);

    expect(
      screen.getByText("Chart types: Epicurve, Rate plot"),
    ).toBeInTheDocument();
  });

  it("describes the data:context permission in plain language", async () => {
    await _renderExpandedDetails(EPIDEMIOLOGY_MANIFEST);

    expect(
      screen.getByText(
        "A query result's rows, only when you run one of its tools on that result",
      ),
    ).toBeInTheDocument();
  });

  it("describes the query:addColumns permission in plain language", async () => {
    await _renderExpandedDetails(
      _makeManifest({
        hasToolbarCommand: true,
        hasChartTypes: false,
        permissions: ["data:context", "query:addColumns"],
      }),
    );

    expect(
      screen.getByText(
        "Add calculated columns to a Data Explorer query when you run one of its tools",
      ),
    ).toBeInTheDocument();
  });

  it("says its charts see only their own rows when the plugin adds chart types", async () => {
    await _renderExpandedDetails(EPIDEMIOLOGY_MANIFEST);

    expect(
      screen.getByText("Its charts see only the rows of the chart they draw"),
    ).toBeInTheDocument();
  });

  it("leaves out the charts line when the plugin adds no chart types", async () => {
    await _renderExpandedDetails(
      _makeManifest({
        hasToolbarCommand: true,
        hasChartTypes: false,
        permissions: ["data:context"],
      }),
    );

    expect(screen.queryByText(/Its charts see only/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Chart types:/)).not.toBeInTheDocument();
  });

  it("says the plugin adds nothing yet when it contributes nothing", async () => {
    await _renderExpandedDetails(EMPTY_MANIFEST);

    expect(screen.getByText("Nothing yet.")).toBeInTheDocument();
    expect(
      screen.queryByText(/Data Explorer toolbar:/),
    ).not.toBeInTheDocument();
  });

  it("says the plugin uses no workspace data when it has no permissions and no chart types", async () => {
    await _renderExpandedDetails(EMPTY_MANIFEST);

    expect(screen.getByText("Uses no workspace data.")).toBeInTheDocument();
  });
});
