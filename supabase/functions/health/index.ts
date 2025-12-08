import { MiniServer } from "../_shared/MiniServer/MiniServer.ts";
import { Routes } from "./health.routes.ts";

MiniServer(Routes).serve();
