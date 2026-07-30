import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { GoogleAuthCallbackRoutes } from "@sbfn/google-auth-callback/GoogleAuthCallbackRoutes.ts";

MiniServer(GoogleAuthCallbackRoutes).serve();
