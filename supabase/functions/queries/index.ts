import { MiniServer } from "../_shared/MiniServer/MiniServer.ts";
import { Routes } from "./queries.routes.ts";

MiniServer(Routes).serve();
