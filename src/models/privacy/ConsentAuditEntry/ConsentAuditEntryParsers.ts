import { makeParserRegistry } from "@clients";
import { identity } from "@utils";
import { uuidType } from "$/lib/zodHelpers";
import { z } from "zod";
import {
  ConsentAuditContexts,
  ConsentAuditMedicalTiers,
  ConsentAuditModes,
  ConsentAuditWarnings,
  ConsentDecisionKinds,
} from "./ConsentAuditEntry";
import type { ConsentAuditEntry } from "./ConsentAuditEntry";
import type { Expect, ZodSchemaEqualsTypes } from "@utils";

const DBReadSchema = z.object({
  id: uuidType<ConsentAuditEntry.Id>(),
  workspaceId: z.string(),
  userId: z.string(),
  threadId: z.string().nullable(),
  timestamp: z.number(),
  decision: z.enum(ConsentDecisionKinds),
  context: z.enum(ConsentAuditContexts),
  mode: z.enum(ConsentAuditModes),
  detectedPii: z.array(z.string()),
  detectedBias: z.array(z.string()),
  sourceColumn: z.string().nullable(),
  valueCount: z.number(),
  contentLengthChars: z.number().nullable(),
  warningShown: z.array(z.enum(ConsentAuditWarnings)),
  warningDismissed: z.array(z.enum(ConsentAuditWarnings)),
  suggestionUsed: z.boolean().nullable(),
  patternLocale: z.string(),
  detectorVersion: z.string(),
  medicalTierTriggeredBy: z.enum(ConsentAuditMedicalTiers).nullable(),
  typedConfirmationCorrect: z.boolean().nullable(),
  ackTokenNonce: z.string().nullable(),
});

/** Parser registry for browser-local consent audit rows. */
export const ConsentAuditEntryParsers =
  makeParserRegistry<ConsentAuditEntry.Model>().build({
    modelName: "ConsentAuditEntry",
    DBReadSchema,
    fromDBReadToModelRead: identity,
    fromModelInsertToDBInsert: identity,
    fromModelUpdateToDBUpdate: identity,
  });

/** Do not remove these tests! */
type CrudTypes = ConsentAuditEntry.Model;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
