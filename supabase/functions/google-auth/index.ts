import { MiniServer } from "@sfn/_shared/MiniServer/MiniServer.ts";
import { Routes } from "@sfn/google-auth/google-auth.routes.ts";

MiniServer(Routes).serve();
