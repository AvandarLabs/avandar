import { MiniServer } from "@sfn/_shared/MiniServer/MiniServer.ts";
import { Routes } from "@sfn/workspaces/workspaces.routes.ts";

MiniServer(Routes).serve();
