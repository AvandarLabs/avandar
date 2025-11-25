import { MiniServer } from "../_shared/MiniServer/MiniServer.ts";
import { Routes } from "./google-auth-callback.routes.ts";

MiniServer(Routes).serve();
