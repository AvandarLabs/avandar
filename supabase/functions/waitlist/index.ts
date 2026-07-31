import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { WaitlistRoutes } from "@sbfn/waitlist/WaitlistRoutes.ts";

MiniServer(WaitlistRoutes).serve();
