import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { ConnectorRoutes } from "@sbfn/connectors/ConnectorRoutes/ConnectorRoutes.ts";

MiniServer(ConnectorRoutes).serve();
