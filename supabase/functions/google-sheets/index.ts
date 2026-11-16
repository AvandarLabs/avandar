import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { GoogleSheetsRoutes } from "@sbfn/google-sheets/GoogleSheetsRoutes/GoogleSheetsRoutes.ts";

MiniServer(GoogleSheetsRoutes).serve();
