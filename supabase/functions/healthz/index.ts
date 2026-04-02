import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { Routes } from "@sbfn/healthz/healthz.routes.ts";

MiniServer(Routes).serve();
