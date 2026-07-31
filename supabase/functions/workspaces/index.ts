import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { WorkspacesRoutes } from "@sbfn/workspaces/WorkspacesRoutes.ts";

MiniServer(WorkspacesRoutes).serve();
