import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { SupportRoutes } from "@sbfn/support/SupportRoutes.ts";

MiniServer(SupportRoutes).serve();
