import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getResendFullAccessAPIKey } from "$/env/getResendFullAccessAPIKey.ts";
import { getResendSendingAPIKey } from "$/env/getResendSendingAPIKey.ts";

describe("Resend API key accessors", () => {
  const originalEnvironment = { ...process.env };

  beforeEach(() => {
    delete process.env.RESEND_SENDING_API_KEY;
    delete process.env.RESEND_FULL_ACCESS_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnvironment };
  });

  it("returns the sending API key", () => {
    process.env.RESEND_SENDING_API_KEY = "sending-key";

    expect(getResendSendingAPIKey()).toBe("sending-key");
  });

  it("returns the full-access API key", () => {
    process.env.RESEND_FULL_ACCESS_API_KEY = "full-access-key";

    expect(getResendFullAccessAPIKey()).toBe("full-access-key");
  });

  it("does not use the legacy key for sending access", () => {
    process.env[["RESEND", "API", "KEY"].join("_")] = "legacy-key";

    expect(() => {
      return getResendSendingAPIKey();
    }).toThrow("RESEND_SENDING_API_KEY is not set");
  });

  it("does not use the legacy key for full access", () => {
    process.env[["RESEND", "API", "KEY"].join("_")] = "legacy-key";

    expect(() => {
      return getResendFullAccessAPIKey();
    }).toThrow("RESEND_FULL_ACCESS_API_KEY is not set");
  });
});
