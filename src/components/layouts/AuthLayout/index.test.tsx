import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HEADER_DESKTOP_TITLEBAR_HEIGHT } from "@/components/layouts/AppLayout/AppLayout";
import { AuthLayout } from "./index";

describe("AuthLayout", () => {
  afterEach(() => {
    delete document.documentElement.dataset.avaPlatform;
  });

  it("renders a desktop drag region across the top of auth pages", () => {
    document.documentElement.dataset.avaPlatform = "desktop";

    const { container } = render(
      <MantineProvider>
        <AuthLayout title="Sign in">content</AuthLayout>
      </MantineProvider>,
    );

    const dragRegion = container.querySelector(
      ".electrobun-webkit-app-region-drag",
    );

    expect(dragRegion).not.toBeNull();
    expect(dragRegion).toHaveStyle({
      height: `${HEADER_DESKTOP_TITLEBAR_HEIGHT}px`,
    });
  });

  it("does not render a desktop drag region on web", () => {
    const { container } = render(
      <MantineProvider>
        <AuthLayout title="Sign in">content</AuthLayout>
      </MantineProvider>,
    );

    expect(
      container.querySelector(".electrobun-webkit-app-region-drag"),
    ).toBeNull();
  });
});
