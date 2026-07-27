import { makeParserRegistry } from "@clients";
import { identity } from "@utils";
import { uuidType } from "$/lib/zodHelpers";
import { z } from "zod";
import type { Expect, ZodSchemaEqualsTypes } from "@utils";
import {
  ClarificationOutcomes,
  ClarificationResponseShapeLabels,
} from "./ClarificationAuditEntry.types";
import type {
  ClarificationAuditEntryId,
  ClarificationAuditEntryModel,
} from "./ClarificationAuditEntry.types";

const DBReadSchema = z.object({
  id: uuidType<ClarificationAuditEntryId>(),
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
  makeParserRegistry<ClarificationAuditEntryModel>().build({
    modelName: "ClarificationAuditEntry",
    DBReadSchema,
    fromDBReadToModelRead: identity,
    fromModelInsertToDBInsert: identity,
    fromModelUpdateToDBUpdate: identity,
  });

/** Do not remove these tests! */
type CrudTypes = ClarificationAuditEntryModel;
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
