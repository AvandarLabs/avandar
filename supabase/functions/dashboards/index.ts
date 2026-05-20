import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { Routes } from "@sbfn/dashboards/dashboards.routes.ts";

MiniServer(Routes).serve();
