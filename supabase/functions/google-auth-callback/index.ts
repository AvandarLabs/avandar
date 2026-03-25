import { MiniServer } from "@sfn/_shared/MiniServer/MiniServer.ts";
import { Routes } from "@sfn/google-auth-callback/google-auth-callback.routes.ts";

MiniServer(Routes).serve();
