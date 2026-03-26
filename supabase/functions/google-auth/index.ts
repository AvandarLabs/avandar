import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { Routes } from "@sbfn/google-auth/google-auth.routes.ts";

MiniServer(Routes).serve();
