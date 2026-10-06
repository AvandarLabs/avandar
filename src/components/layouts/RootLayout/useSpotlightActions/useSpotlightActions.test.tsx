import { readFileSync } from "node:fs";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { MantineProvider } from "@mantine/core";
import { Notifications, notifications } from "@mantine/notifications";
import { Spotlight, spotlight } from "@mantine/spotlight";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSpotlightActions } from "./useSpotlightActions";
import type { ReactNode } from "react";

// Version commands do not use navigation or browser database workers.
vi.mock("@tanstack/react-router", () => {
  return {
    useRouter: () => {
      return { navigate: vi.fn() };
    },
  };
});
vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return { DuckDbClient: {} };
});
vi.mock("@/db/dexie/AvaDexie", () => {
  return { AvaDexie: {} };
});

const packageVersion: string = (
  JSON.parse(readFileSync("package.json", "utf8")) as { version: string }
).version;

function SpotlightHarness(): ReactNode {
  const actions = useSpotlightActions("test-workspace");
  return (
    <>
      <Spotlight actions={actions} transitionProps={{ duration: 0 }} />
      <Notifications transitionDuration={0} />
    </>
  );
}

function _renderSpotlight(): void {
  render(
    <I18nProvider i18n={i18n}>
      <MantineProvider>
        <SpotlightHarness />
      </MantineProvider>
    </I18nProvider>,
  );
  fireEvent.keyDown(document.body, { key: "k", metaKey: true });
}

afterEach(() => {
  act(() => {
    spotlight.close();
    notifications.clean();
  });
  vi.unstubAllEnvs();
});

describe("Spotlight current version command", () => {
  it("shows the package version after searching for version and pressing Enter", async () => {
    _renderSpotlight();
    const search = await screen.findByRole("textbox");
    fireEvent.change(search, { target: { value: "version" } });
    const action = await screen.findByRole("button", {
      name: `Show current version Avandar ${packageVersion}`,
    });
    expect(action).toHaveTextContent(packageVersion);

    fireEvent.keyDown(search, { key: "ArrowDown", code: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter", code: "Enter" });

    expect(await screen.findByText("Current version")).toBeVisible();
    expect(screen.getByText(`Avandar ${packageVersion}`)).toBeVisible();
    await waitFor(() => {
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });

  it("finds the package version and shows it on click even when developer actions are disabled", async () => {
    vi.stubEnv("DEV", false);
    _renderSpotlight();
    const search = await screen.findByRole("textbox");
    fireEvent.change(search, { target: { value: packageVersion } });
    fireEvent.click(
      await screen.findByRole("button", {
        name: `Show current version Avandar ${packageVersion}`,
      }),
    );

    expect(await screen.findByText("Current version")).toBeVisible();
    expect(screen.getByText(`Avandar ${packageVersion}`)).toBeVisible();
  });
});
