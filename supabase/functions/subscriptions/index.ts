import { MiniServer } from "../_shared/MiniServer/MiniServer.ts";
import { Routes } from "./subscriptions.routes.ts";

MiniServer(Routes).serve();
