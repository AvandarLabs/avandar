import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { PolarPublicRoutes } from "@sbfn/polar-public/PolarPublicRoutes.ts";

MiniServer(PolarPublicRoutes).serve();
