import { MiniServer } from "../_shared/MiniServer/MiniServer.ts";
import { Routes } from "./google-sheets.routes.ts";

MiniServer(Routes).serve();
