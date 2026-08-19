import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { OpenDataRoutes } from "@sbfn/open-data/OpenDataRoutes.ts";

MiniServer(OpenDataRoutes).serve();
