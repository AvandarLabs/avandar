import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored input with bounded collections and semantic validation. */
export const inputSchema = z
  .strictObject({
    referrals: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          personLabel: z.string().min(0).max(18),
          attended: z.boolean(),
          acknowledged: z.boolean(),
        }),
      )
      .min(1)
      .max(5),
    services: z.strictObject({
      referring: z.string().min(1).max(24),
      receiving: z.string().min(1).max(24),
    }),
    sceneLabel: z.string().min(1).max(40),
    emphasis: z.enum(["person-journey", "return-message"]),
    showLedger: z.boolean(),
    copy: z.strictObject({
      waiting: z.string().min(1).max(42),
      attendedOpen: z.string().min(1).max(42),
      closed: z.string().min(1).max(42),
      referrals: z.string().min(1).max(42),
      attendance: z.string().min(1).max(42),
      returned: z.string().min(1).max(42),
    }),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.referrals.map(prop("id"))).size !== input.referrals.length
    ) {
      context.addIssue({
        code: "custom",
        message: "Referral identities must be unique.",
        path: ["referrals"],
      });
    }
    input.referrals.forEach((referral, index) => {
      if (referral.acknowledged && !referral.attended) {
        context.addIssue({
          code: "custom",
          message: "Acknowledgement requires attendance.",
          path: ["referrals", index, "acknowledged"],
        });
      }
    });
  }) satisfies z.ZodType;
/** Input is inferred from the runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Runtime constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "referral-return-acknowledgement.0",
    paths: [
      "referrals",
      "services",
      "sceneLabel",
      "emphasis",
      "showLedger",
      "copy",
    ],
    description:
      "The denominator is referrals.length, one referral for one distinct person in this example. Waiting + attended without return + returned acknowledgement equals the total.",
  },
  {
    id: "referral-return-acknowledgement.1",
    paths: ["referrals.*.acknowledged", "referrals.*.attended"],
    description:
      "acknowledged=true requires attended=true. Derived attendance counts and returned-acknowledgement counts are labeled separately and may overlap; they must not be summed as exclusive categories.",
  },
  {
    id: "referral-return-acknowledgement.2",
    paths: [
      "referrals",
      "services",
      "sceneLabel",
      "emphasis",
      "showLedger",
      "copy",
    ],
    description:
      "An acknowledgement is communication evidence only. It does not establish diagnosis, treatment completion, recovery, clinical quality, or an appropriate referral.",
  },
  {
    id: "referral-return-acknowledgement.3",
    paths: [
      "referrals",
      "services",
      "sceneLabel",
      "emphasis",
      "showLedger",
      "copy",
    ],
    description:
      "No emergency priorities, treatment choices, clinical referral criteria, travel durations, or personal medical information are depicted.",
  },
  {
    id: "referral-return-acknowledgement.referral-identities",
    paths: ["referrals.*.id"],
    description:
      "Referral IDs must be unique. An empty string remains a valid ID when unique.",
  },
];
