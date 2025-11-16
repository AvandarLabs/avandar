import { MiniServer } from "../_shared/MiniServer/MiniServer.ts";
import { Routes } from "./billing.routes.ts";

MiniServer(Routes).serve();
