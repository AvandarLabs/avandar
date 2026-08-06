import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { DashboardsRoutes } from "@sbfn/dashboards/DashboardsRoutes/DashboardsRoutes.ts";

MiniServer(DashboardsRoutes).serve();
