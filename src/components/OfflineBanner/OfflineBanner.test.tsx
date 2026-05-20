import { I18nProvider } from "@lingui/react";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@/i18n/i18n";
import { OfflineBanner } from "@/components/OfflineBanner/OfflineBanner";

function renderOfflineBanner() {
  return render(
    <I18nProvider i18n={i18n}>
      <MantineProvider>
        <OfflineBanner />
      </MantineProvider>
    </I18nProvider>,
  );
}

describe("OfflineBanner", () => {
  afterEach(() => {
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("renders nothing when online", () => {
    vi.stubGlobal("navigator", { onLine: true });
    renderOfflineBanner();
    expect(screen.queryByText(/You are offline/i)).not.toBeInTheDocument();
  });

  it("renders alert when offline", () => {
    vi.stubGlobal("navigator", { onLine: false });
    renderOfflineBanner();
    expect(screen.getByText(/You are offline/i)).toBeInTheDocument();
  });
});
