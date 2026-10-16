/**
 * Enforce that all data crossing the LLM boundary goes through
 * `src/lib/privacy/decideIfDataCanCrossBoundary.tsx`. The ack-token issuance
 * and the pending-acks queue are the load-bearing pieces of the consent
 * pipeline, importing them anywhere else lets a caller forge a token
 * or drop the queue check. This forces `decideIfDataCanCrossBoundary` as the
 * single chokepoint for data crossing the LLM boundary.
 *
 * Adding a new caller for `issueAckToken` or `registerAck`? Don't. Add
 * a new context to `CrossBoundaryContext` and route through
 * `decideIfDataCanCrossBoundary` instead.
 */
export const privacyChokepoint = [
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/lib/privacy/decideIfDataCanCrossBoundary.tsx",
      "src/lib/privacy/sessionSecret.ts",
      "src/lib/privacy/pendingAcks.ts",
      "src/lib/privacy/**/*.test.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/privacy/sessionSecret",
              importNames: ["issueAckToken"],
              message:
                "Privacy chokepoint: ack tokens must only be minted inside decideIfDataCanCrossBoundary.tsx. Route your call through decideIfDataCanCrossBoundary() instead.",
            },
            {
              name: "@/lib/privacy/pendingAcks",
              importNames: ["registerAck"],
              message:
                "Privacy chokepoint: pending acks must only be registered inside decideIfDataCanCrossBoundary.tsx. Route your call through decideIfDataCanCrossBoundary() instead.",
            },
          ],
        },
      ],
    },
  },
];
