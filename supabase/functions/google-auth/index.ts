import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { GoogleAuthRoutes } from "@sbfn/google-auth/GoogleAuthRoutes.ts";

MiniServer(GoogleAuthRoutes).serve();
