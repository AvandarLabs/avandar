import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { Routes } from "@sbfn/google-auth-callback/google-auth-callback.routes.ts";

MiniServer(Routes).serve();
