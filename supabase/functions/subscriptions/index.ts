import { MiniServer } from "@sfn/_shared/MiniServer/MiniServer.ts";
import { Routes } from "@sfn/subscriptions/subscriptions.routes.ts";

MiniServer(Routes).serve();
