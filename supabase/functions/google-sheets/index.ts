import { MiniServer } from "@sfn/_shared/MiniServer/MiniServer.ts";
import { Routes } from "@sfn/google-sheets/google-sheets.routes.ts";

MiniServer(Routes).serve();
