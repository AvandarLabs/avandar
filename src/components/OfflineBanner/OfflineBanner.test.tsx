import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OfflineBanner } from "@/components/OfflineBanner/OfflineBanner";

function renderOfflineBanner() {
  return render(
    <MantineProvider>
      <OfflineBanner />
    </MantineProvider>,
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
