import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { SubscriptionsRoutes } from "@sbfn/subscriptions/SubscriptionsRoutes.ts";

MiniServer(SubscriptionsRoutes).serve();
