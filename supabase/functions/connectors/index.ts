import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { ExternalDatasetRoutes } from "@sbfn/connectors/ExternalDatasetRoutes.ts";

MiniServer(ExternalDatasetRoutes).serve();
