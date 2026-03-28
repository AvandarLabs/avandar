import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { Routes } from "@sbfn/health/health.routes.ts";

MiniServer(Routes).serve();
