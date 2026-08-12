import { makeParserRegistry } from "@avandar/clients";
import {
  camelCaseKeysDeep,
  coerceDatesInProps,
  convertDatesToISOInProps,
  excludeNullsDeep,
  nullsToUndefinedDeep,
  pipe,
  snakeCaseKeysDeep,
  undefinedsToNullsDeep,
} from "@avandar/utils";
import { SubscriptionModule } from "$/models/Subscription/SubscriptionModule/SubscriptionModule.ts";
import { z } from "zod";
import type { Expect } from "@avandar/utils";
import type { ZodSchemaEqualsTypes } from "@utils/zod/index.ts";
import type {
  PolarCustomerId,
  PolarProductId,
  SubscriptionId,
  SubscriptionPolarId,
  SubscriptionRead,
} from "$/models/Subscription/Subscription.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types.ts";
import type { SetOptional } from "type-fest";

export type SubscriptionModel = SupabaseCrudModelSpec<
  {
    tableName: "subscriptions";
    modelName: "Subscription";
    modelPrimaryKeyType: SubscriptionId;
    modelTypes: {
      Read: SubscriptionRead;
      Insert: SetOptional<
        SubscriptionRead,
        | "createdAt"
        | "currentPeriodEnd"
        | "currentPeriodStart"
        | "endedAt"
        | "endsAt"
        | "id"
        | "polarCustomerEmail"
        | "polarCustomerId"
        | "polarProductId"
        | "polarSubscriptionId"
        | "startedAt"
        | "updatedAt"
      >;
      Update: Partial<SubscriptionRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

const DBReadSchema = z.object({
  id: z.uuid(),
  polar_subscription_id: z.uuid().nullable(),
  workspace_id: z.uuid(),
  subscription_owner_id: z.uuid(),
  polar_customer_id: z.uuid().nullable(),
  polar_customer_email: z.string().nullable(),
  polar_product_id: z.uuid().nullable(),
  feature_plan_type: z.enum(SubscriptionModule.FeaturePlanTypes),
  subscription_status: z.enum(SubscriptionModule.Statuses),
  started_at: z.iso.datetime({ offset: true }).nullable(),
  ends_at: z.iso.datetime({ offset: true }).nullable(),
  ended_at: z.iso.datetime({ offset: true }).nullable(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
  current_period_start: z.iso.datetime({ offset: true }).nullable(),
  current_period_end: z.iso.datetime({ offset: true }).nullable(),
  max_seats_allowed: z.number(),
  max_datasets_allowed: z.number().nullable(),
  max_dashboards_allowed: z.number().nullable(),
  max_shareable_dashboards_allowed: z.number().nullable(),
});

export const SubscriptionParsers =
  makeParserRegistry<SubscriptionModel>().build({
    modelName: "Subscription",
    DBReadSchema,
    fromDBReadToModelRead: pipe(
      camelCaseKeysDeep,
      nullsToUndefinedDeep,
      coerceDatesInProps([
        "createdAt",
        "updatedAt",
        "startedAt",
        "endsAt",
        "endedAt",
        "currentPeriodStart",
        "currentPeriodEnd",
      ]),
      (obj): SubscriptionRead => {
        return {
          ...obj,
          id: obj.id as SubscriptionId,
          workspaceId: obj.workspaceId as WorkspaceId,
          subscriptionOwnerId: obj.subscriptionOwnerId as UserId,
          polarCustomerId:
            obj.polarCustomerId != null ?
              (obj.polarCustomerId as PolarCustomerId)
            : undefined,
          polarCustomerEmail:
            obj.polarCustomerEmail != null ? obj.polarCustomerEmail : undefined,
          polarProductId:
            obj.polarProductId != null ?
              (obj.polarProductId as PolarProductId)
            : undefined,
          polarSubscriptionId:
            obj.polarSubscriptionId != null ?
              (obj.polarSubscriptionId as SubscriptionPolarId)
            : undefined,
        };
      },
    ),

    fromModelInsertToDBInsert: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsDeep,
      convertDatesToISOInProps([
        "created_at",
        "updated_at",
        "started_at",
        "ends_at",
        "ended_at",
        "current_period_start",
        "current_period_end",
      ]),
    ),

    fromModelUpdateToDBUpdate: pipe(
      snakeCaseKeysDeep,
      undefinedsToNullsDeep,
      excludeNullsDeep,
      convertDatesToISOInProps([
        "created_at",
        "updated_at",
        "started_at",
        "ends_at",
        "ended_at",
        "current_period_start",
        "current_period_end",
      ]),
    ),
  });

/**
 * Do not remove these tests!
 */
type CrudTypes = SubscriptionModel;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type tests - this variable is intentionally not used
type ZodConsistencyTests = [
  // Check that the DBReadSchema is consistent with the DBRead type.
  Expect<
    ZodSchemaEqualsTypes<
      typeof DBReadSchema,
      { input: CrudTypes["DBRead"]; output: CrudTypes["DBRead"] }
    >
  >,
];
