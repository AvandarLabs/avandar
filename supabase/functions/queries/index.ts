import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { Routes } from "@sbfn/queries/queries.routes.ts";

MiniServer(Routes).serve();
