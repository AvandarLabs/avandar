import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { Routes } from "@sbfn/subscriptions/subscriptions.routes.ts";

MiniServer(Routes).serve();
