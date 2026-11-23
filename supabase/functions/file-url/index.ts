import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { FileUrlRoutes } from "@sbfn/file-url/FileUrlRoutes.ts";

MiniServer(FileUrlRoutes).serve();
