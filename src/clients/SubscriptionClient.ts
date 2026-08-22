import type { Workspace } from "$/models/Workspace/Workspace";

import { SubscriptionParsers } from "$/models/Subscription/SubscriptionParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { APIClient } from "@/clients/APIClient";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

export const SubscriptionClient = createUsableServiceClient(
  createRdbCrudClient({
    modelName: "Subscription",
    tableName: "subscriptions",
    dbTablePrimaryKey: "id",
    parsers: SubscriptionParsers,
    mutations: ({ clientLogger }) => {
      return {
        createFreeSubscription: async (options: {
          workspaceId: Workspace.Id;
        }): Promise<void> => {
          const logger = clientLogger.appendName("createFreeSubscription");
          logger.log("Creating native free subscription", {
            workspaceId: options.workspaceId,
          });
          await APIClient.post({
            route: "subscriptions/create-free",
            body: {
              workspaceId: options.workspaceId,
            },
          });
        },
      };
    },
  }),
  {
    mutationFns: ["createFreeSubscription"],
  },
);
