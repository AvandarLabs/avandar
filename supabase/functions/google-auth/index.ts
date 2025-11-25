import { MiniServer } from "../_shared/MiniServer/MiniServer.ts";
import { Routes } from "./google-auth.routes.ts";

MiniServer(Routes).serve();
