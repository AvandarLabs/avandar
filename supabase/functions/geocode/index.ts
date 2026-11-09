import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { GeocodeRoutes } from "@sbfn/geocode/GeocodeRoutes/GeocodeRoutes.ts";

MiniServer(GeocodeRoutes).serve();
