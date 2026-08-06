import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { HealthzRoutes } from "@sbfn/healthz/HealthzRoutes.ts";

MiniServer(HealthzRoutes).serve();
