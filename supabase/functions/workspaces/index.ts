import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { Routes } from "@sbfn/workspaces/workspaces.routes.ts";

MiniServer(Routes).serve();
