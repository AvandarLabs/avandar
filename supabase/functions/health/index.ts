import { MiniServer } from "@sfn/_shared/MiniServer/MiniServer.ts";
import { Routes } from "@sfn/health/health.routes.ts";

MiniServer(Routes).serve();
