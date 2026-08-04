import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/providers/AvandarUiProvider";
import { render, screen } from "@/test-utils";
import { OfflineChatDownloadIndicator } from "./OfflineChatDownloadIndicator";
import type { OfflineChatManagerStatus } from "@/lib/offlineChat/OfflineChatResourceManager";

let mockStatus: OfflineChatManagerStatus = { kind: "idle" };

vi.mock("@/lib/offlineChat/useOfflineChatManagerStatus", () => {
  return {
    useOfflineChatManagerStatus: () => {
      return mockStatus;
    },
  };
});

describe("OfflineChatDownloadIndicator", () => {
  afterEach(() => {
    mockStatus = { kind: "idle" };
  });

  it("renders nothing in the idle state", () => {
    mockStatus = { kind: "idle" };
    render(
      <I18nProvider i18n={i18n}>
        <AvandarUiProvider>
          <OfflineChatDownloadIndicator />
        </AvandarUiProvider>
      </I18nProvider>,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows progress and status text while downloading", () => {
    mockStatus = {
      kind: "downloading",
      modelId: "qwen-1.5b",
      progress: 0.42,
    };
    render(
      <I18nProvider i18n={i18n}>
        <AvandarUiProvider>
          <OfflineChatDownloadIndicator />
        </AvandarUiProvider>
      </I18nProvider>,
    );

    expect(screen.getByText(/Qwen 2.5 1.5B \(offline\)/i)).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText("Preparing model files…")).toBeInTheDocument();
    expect(
      screen.getByText(/Do not refresh or close this tab/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
