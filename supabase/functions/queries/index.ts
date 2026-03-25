import { MiniServer } from "@sfn/_shared/MiniServer/MiniServer.ts";
import { Routes } from "@sfn/queries/queries.routes.ts";

MiniServer(Routes).serve();
