import { makeParserRegistry } from "@avandar/clients";
import { identity } from "@avandar/utils";
import { z } from "zod";
import { uuidType } from "$/lib/zodHelpers";
import {
  ClarificationOutcomes,
  ClarificationResponseShapeLabels,
} from "./ClarificationAuditEntry";
import type { ClarificationAuditEntry } from "./ClarificationAuditEntry";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@avandar/utils/zod";

const DBReadSchema = z.object({
  id: uuidType<ClarificationAuditEntry.Id>(),
  workspaceId: z.string(),
  threadId: z.string().nullable(),
  timestamp: z.number(),
  turnNumber: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  responseShape: z.enum(ClarificationResponseShapeLabels),
  questionLengthChars: z.number(),
  rationaleProvided: z.boolean(),
  optionsCount: z.number().nullable(),
  outcome: z.enum(ClarificationOutcomes),
  biasReprompts: z.number(),
  timeToAnswerMs: z.number().nullable(),
  ledToSuccessfulSql: z.boolean().nullable(),
  patternLocale: z.string(),
});

/** Parser registry for browser-local clarification audit rows. */
export const ClarificationAuditEntryParsers =
  makeParserRegistry<ClarificationAuditEntry.Model>().build({
    modelName: "ClarificationAuditEntry",
    DBReadSchema,
    fromDBReadToModelRead: identity,
    fromModelInsertToDBInsert: identity,
    fromModelUpdateToDBUpdate: identity,
  });

/** Do not remove these tests! */
type CrudTypes = ClarificationAuditEntry.Model;
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
