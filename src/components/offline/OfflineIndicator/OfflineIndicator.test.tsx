import { I18nProvider } from "@lingui/react";
import { MantineProvider } from "@mantine/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OfflineIndicator } from "@/components/offline/OfflineIndicator/OfflineIndicator";
import { i18n } from "@/i18n/i18n";
import { render, screen } from "@/test-utils";

function renderOfflineIndicator() {
  return render(
    <I18nProvider i18n={i18n}>
      <MantineProvider>
        <OfflineIndicator />
      </MantineProvider>
    </I18nProvider>,
  );
}

describe("OfflineIndicator", () => {
  afterEach(() => {
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("renders nothing when online", () => {
    vi.stubGlobal("navigator", { onLine: true });
    renderOfflineIndicator();
    expect(screen.queryByText(/You are offline/i)).not.toBeInTheDocument();
  });

  it("renders compact status when offline", () => {
    vi.stubGlobal("navigator", { onLine: false });
    renderOfflineIndicator();
    expect(screen.getByText(/You are offline/i)).toBeInTheDocument();
  });
});
