import { DesktopAuthProvider } from "$/platform/desktop/DesktopAuthProvider";
import { afterEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@/test-utils";
import { PlatformProvider, usePlatform } from "./PlatformProvider";

function PlatformKindProbe(): JSX.Element {
  const { authProvider } = usePlatform();

  return (
    <div>
      {authProvider === DesktopAuthProvider ? "desktop-auth" : "web-auth"}
    </div>
  );
}

describe("PlatformProvider", () => {
  afterEach(() => {
    delete document.documentElement.dataset.avaPlatform;
  });

  it("switches to desktop implementations when the desktop marker arrives after first render", async () => {
    render(
      <PlatformProvider>
        <PlatformKindProbe />
      </PlatformProvider>,
    );

    expect(screen.getByText("web-auth")).toBeInTheDocument();

    await act(async () => {
      document.documentElement.dataset.avaPlatform = "desktop";
      await Promise.resolve();
    });

    expect(screen.getByText("desktop-auth")).toBeInTheDocument();
  });
});
