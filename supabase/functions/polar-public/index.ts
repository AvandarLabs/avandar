import { MiniServer } from "../_shared/MiniServer/MiniServer.ts";
import { Routes } from "./polar-public.routes.ts";

MiniServer(Routes).serve();
