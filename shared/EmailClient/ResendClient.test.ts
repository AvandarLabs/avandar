import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { constructorKeys, operationCalls } = vi.hoisted(() => {
  return {
    constructorKeys: [] as string[],
    operationCalls: [] as Array<{ apiKey: string; operation: string }>,
  };
});

vi.mock("@upstash/ratelimit", () => {
  return {
    Ratelimit: class {
      static slidingWindow(): Record<string, never> {
        return {};
      }

      async limit(): Promise<{ success: true; reset: undefined }> {
        return { success: true, reset: undefined };
      }
    },
  };
});

vi.mock("@upstash/redis", () => {
  return {
    Redis: class {},
  };
});

vi.mock("resend", () => {
  return {
    Resend: class {
      emails: { send: () => Promise<{ data: { id: string }; error: null }> };
      broadcasts: {
        create: () => Promise<{ data: { id: string }; error: null }>;
        send: () => Promise<{ data: { id: string }; error: null }>;
      };
      contacts: {
        create: () => Promise<{ data: { id: string }; error: null }>;
        update: () => Promise<{ data: { id: string }; error: null }>;
        get: () => Promise<{ data: { id: string }; error: null }>;
      };
      topics: { list: () => Promise<{ data: never[]; error: null }> };

      constructor(apiKey: string) {
        constructorKeys.push(apiKey);
        const createOperation = (operation: string) => {
          return async () => {
            operationCalls.push({ apiKey, operation });
            return { data: { id: "result-id" }, error: null };
          };
        };

        this.emails = { send: createOperation("emails.send") };
        this.broadcasts = {
          create: createOperation("broadcasts.create"),
          send: createOperation("broadcasts.send"),
        };
        this.contacts = {
          create: createOperation("contacts.create"),
          update: createOperation("contacts.update"),
          get: createOperation("contacts.get"),
        };
        this.topics = {
          list: async () => {
            operationCalls.push({ apiKey, operation: "topics.list" });
            return { data: [], error: null };
          },
        };
      }
    },
  };
});

const originalEnvironment = { ...process.env };

async function _loadResendClient() {
  vi.resetModules();
  return (await import("$/EmailClient/ResendClient.ts")).ResendClient;
}

describe("ResendClient", () => {
  beforeEach(() => {
    constructorKeys.length = 0;
    operationCalls.length = 0;
    process.env[["RESEND", "API", "KEY"].join("_")] = "legacy-key";
    process.env.RESEND_SENDING_API_KEY = "sending-key";
    process.env.RESEND_FULL_ACCESS_API_KEY = "full-access-key";
    process.env.UPSTASH_REDIS_API_URL = "https://redis.example.com";
    process.env.UPSTASH_REDIS_REST_API_TOKEN = "redis-token";
  });

  afterAll(() => {
    process.env = { ...originalEnvironment };
  });

  it("uses the sending key for email delivery operations", async () => {
    delete process.env.RESEND_FULL_ACCESS_API_KEY;
    const ResendClient = await _loadResendClient();

    await ResendClient.sendEmail({} as never);
    await ResendClient.sendBroadcast("broadcast-id");

    expect(operationCalls).toEqual([
      { apiKey: "sending-key", operation: "emails.send" },
      { apiKey: "sending-key", operation: "broadcasts.send" },
    ]);
    expect(constructorKeys).toEqual(["sending-key"]);
  });

  it("uses the full-access key for resource operations", async () => {
    delete process.env.RESEND_SENDING_API_KEY;
    const ResendClient = await _loadResendClient();

    await ResendClient.createBroadcast({} as never);
    await ResendClient.createContact({} as never);
    await ResendClient.updateContact({} as never);
    await ResendClient.getContact({} as never);
    await ResendClient.listTopics();

    expect(operationCalls).toEqual([
      { apiKey: "full-access-key", operation: "broadcasts.create" },
      { apiKey: "full-access-key", operation: "contacts.create" },
      { apiKey: "full-access-key", operation: "contacts.update" },
      { apiKey: "full-access-key", operation: "contacts.get" },
      { apiKey: "full-access-key", operation: "topics.list" },
    ]);
    expect(constructorKeys).toEqual(["full-access-key"]);
  });

  it("requires the sending key only when sending", async () => {
    delete process.env.RESEND_SENDING_API_KEY;
    const ResendClient = await _loadResendClient();

    await expect(ResendClient.sendEmail({} as never)).rejects.toThrow(
      "RESEND_SENDING_API_KEY is not set",
    );
  });

  it("requires the full-access key only for resource operations", async () => {
    delete process.env.RESEND_FULL_ACCESS_API_KEY;
    const ResendClient = await _loadResendClient();

    await expect(ResendClient.listTopics()).rejects.toThrow(
      "RESEND_FULL_ACCESS_API_KEY is not set",
    );
  });
});
