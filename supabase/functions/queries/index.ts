import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { QueriesRoutes } from "@sbfn/queries/QueriesRoutes.ts";

MiniServer(QueriesRoutes).serve();
