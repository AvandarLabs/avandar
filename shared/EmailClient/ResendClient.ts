import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { getResendFullAccessAPIKey } from "$/env/getResendFullAccessAPIKey.ts";
import { getResendSendingAPIKey } from "$/env/getResendSendingAPIKey.ts";
import type { ErrorResponse } from "resend";

type IResendClient = {
  sendEmail: Resend["emails"]["send"];
  createBroadcast: Resend["broadcasts"]["create"];
  sendBroadcast: Resend["broadcasts"]["send"];
  createContact: Resend["contacts"]["create"];
  updateContact: Resend["contacts"]["update"];
  getContact: Resend["contacts"]["get"];
  listTopics: Resend["topics"]["list"];
};

const limiterId = process.env.BOTTLENECK_ID || "resend-rate-limit";

// Reuse singletons across hot reloads and serverless invocations
const g = globalThis as unknown as {
  __resendRateLimiter?: Ratelimit;
};

function _getResendRateLimiterSingleton(): Ratelimit {
  const limiter =
    g.__resendRateLimiter ??
    new Ratelimit({
      // Upstash (edge-compatible) Redis instance
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_API_URL!,
        token: process.env.UPSTASH_REDIS_REST_API_TOKEN!,
      }),

      // Resend only allows 2 requests per second
      // To allow some slack, we will limit to 1.7 reqs per second
      limiter: Ratelimit.slidingWindow(1.7, "1 s"),

      // Namespace keys to avoid collisions across environments/projects
      // because different environments/projects may still be using the same
      // API key, and thus share the same rate limit.
      prefix: limiterId,
    });

  if (!g.__resendRateLimiter) {
    g.__resendRateLimiter = limiter;
  }
  return g.__resendRateLimiter;
}

function createResendClient(): IResendClient {
  // Fail fast if upstash redis env vars are missing
  if (!process.env.UPSTASH_REDIS_API_URL) {
    throw new Error("UPSTASH_REDIS_API_URL is not set");
  }

  if (!process.env.UPSTASH_REDIS_REST_API_TOKEN) {
    throw new Error("UPSTASH_REDIS_REST_API_TOKEN is not set");
  }

  let sendingResend: Resend | undefined;
  let fullAccessResend: Resend | undefined;

  const _getSendingResend = (): Resend => {
    sendingResend ??= new Resend(getResendSendingAPIKey());
    return sendingResend;
  };

  const _getFullAccessResend = (): Resend => {
    fullAccessResend ??= new Resend(getResendFullAccessAPIKey());
    return fullAccessResend;
  };

  const _withRateLimiter = async <
    T extends { data: unknown; error: ErrorResponse | null },
  >(
    fn: () => Promise<T>,
  ) => {
    const resendLimiter = _getResendRateLimiterSingleton();
    const key = "global"; // single global bucket

    // Schedule-like behavior: wait until a slot is available.
    // `reset` is the timestamp of when the next token becomes available. That
    // way we know exactly how long to wait before trying to call `fn`.
    // If `reset` is undefined, we default to 500ms and then try again.
    // If `reset` is imminent (or in the past), we will always wait at least
    // 100ms to be sure that the rate limit is not violated.
    // This loop will pass quickly when we aren't limited.
    // This whole thing is edge-safe because it uses timers only.
    while (true) {
      const { success, reset } = await resendLimiter.limit(key);
      if (success) {
        const result = await fn();
        if (result.error && result.error.statusCode === 429) {
          // if this is a rate limit error then let's retry
          continue;
        }
        return result;
      }
      const ms =
        typeof reset === "number" ? Math.max(reset - Date.now(), 100) : 500;
      await new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    }
  };

  return {
    sendEmail: async (...params: Parameters<Resend["emails"]["send"]>) => {
      const resend = _getSendingResend();
      return await _withRateLimiter(async () => {
        return await resend.emails.send(...params);
      });
    },
    createContact: async (
      ...params: Parameters<Resend["contacts"]["create"]>
    ) => {
      const resend = _getFullAccessResend();
      return await _withRateLimiter(async () => {
        return await resend.contacts.create(...params);
      });
    },
    updateContact: async (
      ...params: Parameters<Resend["contacts"]["update"]>
    ) => {
      const resend = _getFullAccessResend();
      return await _withRateLimiter(async () => {
        return await resend.contacts.update(...params);
      });
    },
    getContact: async (...params: Parameters<Resend["contacts"]["get"]>) => {
      const resend = _getFullAccessResend();
      return await _withRateLimiter(async () => {
        return await resend.contacts.get(...params);
      });
    },
    createBroadcast: async (
      ...params: Parameters<Resend["broadcasts"]["create"]>
    ) => {
      const resend = _getFullAccessResend();
      return await _withRateLimiter(async () => {
        return await resend.broadcasts.create(...params);
      });
    },
    sendBroadcast: async (
      ...params: Parameters<Resend["broadcasts"]["send"]>
    ) => {
      const resend = _getSendingResend();
      return await _withRateLimiter(async () => {
        return await resend.broadcasts.send(...params);
      });
    },
    listTopics: async (...params: Parameters<Resend["topics"]["list"]>) => {
      const resend = _getFullAccessResend();
      return await _withRateLimiter(async () => {
        return await resend.topics.list(...params);
      });
    },
  };
}

export const ResendClient = createResendClient();
