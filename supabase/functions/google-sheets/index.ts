import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { Routes } from "@sbfn/google-sheets/google-sheets.routes.ts";

MiniServer(Routes).serve();
