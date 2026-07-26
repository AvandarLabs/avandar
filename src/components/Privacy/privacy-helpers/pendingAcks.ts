import { createModule } from "@modules";
import { SessionSecret } from "@/components/Privacy/privacy-helpers/sessionSecret";

/**
 * Module-scope queue of consent ack tokens that have been approved by
 * the user but haven't yet been attached to a backend chat request.
 *
 * `crossBoundary` registers an ack here keyed by the SHA-256 hex of the
 * approved text payload. `useAvandarChatRuntime` looks up matching acks
 * just before POSTing to the chat endpoint and attaches them as
 * `body.consentAcks`. Acks are single-use — once consumed they're
 * deleted from the queue.
 *
 * Why this lives at module scope rather than React state: the consent
 * flow can race with assistant-ui's internal composer state, and the
 * ack must survive across the brief window between modal close and the
 * adapter.run call that follows. Module scope avoids the race entirely.
 *
 * Stale entries that never get consumed are expired by `expiresAt` so
 * an abandoned clarification doesn't leak memory.
 */

export type PendingAck = {
  ackToken: string;
  /** SHA-256 hex of the approved text. */
  payloadHash: string;
  /** Wall-clock ms; acks expire after 5 minutes to match the token TTL. */
  expiresAt: number;
};

const QUEUE = new Map<string, PendingAck>();
const ACK_TTL_MS = 5 * 60 * 1000;

function _gc(): void {
  const now = Date.now();
  for (const [hash, ack] of QUEUE) {
    if (now > ack.expiresAt) {
      QUEUE.delete(hash);
    }
  }
}

export const PendingAcks = createModule("PendingAcks", {
  builder: () => {
    return {
      registerAck: async (args: {
        text: string;
        ackToken: string;
      }): Promise<void> => {
        const payloadHash = await SessionSecret.hashTextPayload(args.text);
        QUEUE.set(payloadHash, {
          ackToken: args.ackToken,
          payloadHash,
          expiresAt: Date.now() + ACK_TTL_MS,
        });
      },

      /**
       * Consume the ack matching `text`, if any. The ack is removed from the
       * queue immediately so two parallel chat turns can't both claim the
       * same ack for the same content.
       */
      consumeAckForText: async (text: string): Promise<string | undefined> => {
        _gc();
        const hash = await SessionSecret.hashTextPayload(text);
        const entry = QUEUE.get(hash);
        if (!entry) {
          return undefined;
        }
        QUEUE.delete(hash);
        return entry.ackToken;
      },

      /** Wipe all pending acks. Used on logout / workspace switch. */
      clearAll: (): void => {
        QUEUE.clear();
      },
    };
  },
});
