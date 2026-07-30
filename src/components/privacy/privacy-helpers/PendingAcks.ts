import { createModule } from "@modules";
import { SessionSecret } from "@/components/privacy/privacy-helpers/SessionSecret";

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

/**
 * Module-scope, single-use queue of consent ack tokens the user has approved
 * but that haven't yet been attached to a backend chat request. `crossBoundary`
 * registers an ack keyed by the SHA-256 hex of the approved payload;
 * `useAvandarChatRuntime` looks up matching acks just before POSTing and
 * attaches them as `body.consentAcks`, deleting each on use. It lives at module
 * scope rather than React state so the ack survives the race between modal
 * close and the follow-up `adapter.run`; stale entries expire via `expiresAt`
 * so an abandoned clarification doesn't leak memory.
 */
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

      // Consume the ack matching `text`, if any. The ack is removed from the
      // queue immediately so two parallel chat turns can't both claim the
      // same ack for the same content.
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

      // Wipe all pending acks. Used on logout / workspace switch.
      clearAll: (): void => {
        QUEUE.clear();
      },
    };
  },
});
