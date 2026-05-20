import { FeatureFlag, isFlagEnabled } from "@/config/FeatureFlagConfig";

export function isOfflineChatEnabled(): boolean {
  return isFlagEnabled(FeatureFlag.EnableOfflineChat);
}

/** True in Vitest / Playwright when we must not load WebLLM weights. */
export function isOfflineChatMockForced(): boolean {
  return import.meta.env.VITE_OFFLINE_CHAT_MOCK === "true";
}
