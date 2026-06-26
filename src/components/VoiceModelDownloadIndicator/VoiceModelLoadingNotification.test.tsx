import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvandarUiProvider } from "@/components/providers/AvandarUiProvider";
import { act, render } from "@/test-utils";
import { VoiceModelLoadingNotification } from "./VoiceModelLoadingNotification";
import type { VoiceManagerStatus } from "@/lib/voice/voiceManagerInterface";

const { notificationShow, notificationHide } = vi.hoisted(() => {
  return {
    notificationShow: vi.fn(),
    notificationHide: vi.fn(),
  };
});

let mockStatus: VoiceManagerStatus = { kind: "idle" };

vi.mock("@mantine/notifications", async () => {
  const actual = await vi.importActual<typeof import("@mantine/notifications")>(
    "@mantine/notifications",
  );
  return {
    ...actual,
    notifications: {
      ...actual.notifications,
      show: (...args: unknown[]) => {
        return notificationShow(...args);
      },
      hide: (...args: unknown[]) => {
        return notificationHide(...args);
      },
    },
  };
});

vi.mock("@/lib/voice/useVoiceModelManager", () => {
  return {
    useVoiceModelStatus: () => {
      return mockStatus;
    },
  };
});

describe("VoiceModelLoadingNotification", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    mockStatus = { kind: "idle" };
    notificationShow.mockClear();
    notificationHide.mockClear();
    vi.useRealTimers();
  });

  it("shows a persistent loading toast while the model warms up", () => {
    mockStatus = { kind: "loading", modelId: "whisper-tiny" };
    render(
      <I18nProvider i18n={i18n}>
        <AvandarUiProvider>
          <VoiceModelLoadingNotification />
        </AvandarUiProvider>
      </I18nProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(notificationShow).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "voice-model-loading",
        loading: true,
        autoClose: false,
      }),
    );
  });

  it("hides the toast when loading finishes", () => {
    mockStatus = { kind: "ready", modelId: "whisper-tiny" };
    render(
      <I18nProvider i18n={i18n}>
        <AvandarUiProvider>
          <VoiceModelLoadingNotification />
        </AvandarUiProvider>
      </I18nProvider>,
    );

    expect(notificationHide).toHaveBeenCalledWith("voice-model-loading");
  });
});
