import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { openChatPanelIfClosed } from "./helpers/chatPanelFlow";
import { dismissBillingModalIfVisible } from "./helpers/dismissBillingModal";
import { LONG_WAIT } from "./helpers/timeouts";

/**
 * Feeds a continuous synthetic mic stream so MediaRecorder can capture >= 0.5s
 * of audio without a real microphone device.
 */
async function installSyntheticMicrophone(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const audioContext = new AudioContext({ sampleRate: 16_000 });
      const destination = audioContext.createMediaStreamDestination();
      const oscillator = audioContext.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = 440;
      oscillator.connect(destination);
      oscillator.start(0);
      (
        window as unknown as { __e2eStopSyntheticMic?: () => void }
      ).__e2eStopSyntheticMic = () => {
        oscillator.stop();
        void audioContext.close();
      };
      return destination.stream;
    };
  });
}

test.describe("Whisper.cpp voice dictation", () => {
  test.describe.configure({ timeout: 120_000 });

  test("supports back-to-back dictation without Already transcribing", async ({
    page,
    context,
  }) => {
    await installSyntheticMicrophone(page);
    await context.grantPermissions(["microphone"], {
      origin: "http://127.0.0.1:5173",
    });

    await signInWithEmailPassword(page, {
      email: "user@avandarlabs.com",
      password: "avandar",
      workspaceSlug: "avandar-labs",
    });

    await page.goto("/avandar-labs/data-explorer", {
      waitUntil: "domcontentloaded",
    });
    await dismissBillingModalIfVisible(page);
    await openChatPanelIfClosed(page);

    const setupMic = page.getByRole("button", {
      name: "Set up voice prompting",
    });
    if (await setupMic.isVisible()) {
      test.skip(
        true,
        "Whisper.cpp ggml model is not downloaded in this Playwright profile.",
      );
    }

    const whisperMic = page.getByRole("button", {
      name: /Speak|Stop and transcribe/i,
    });
    await expect(whisperMic).toBeVisible({ timeout: LONG_WAIT });

    for (let turn = 0; turn < 2; turn += 1) {
      await whisperMic.click();
      await expect(whisperMic).toHaveAttribute(
        "aria-label",
        /Stop and transcribe/i,
        {
          timeout: LONG_WAIT,
        },
      );
      await page.waitForTimeout(1_500);
      await whisperMic.click();
      await expect(whisperMic).toHaveAttribute("aria-label", /^Speak$/i, {
        timeout: LONG_WAIT,
      });
      await expect(page.getByText("Already transcribing")).toHaveCount(0);
    }
  });
});
