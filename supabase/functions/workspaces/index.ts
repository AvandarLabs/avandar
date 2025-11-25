import { MiniServer } from "../_shared/MiniServer/MiniServer.ts";
import { Routes } from "./workspaces.routes.ts";

MiniServer(Routes).serve();
